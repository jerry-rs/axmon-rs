# system-monitor

CPU / 内存 / 磁盘 / Docker / GPU 监控服务，axum + tokio。采用「方案 A」：
进程启动时为每个 collector 起一个常驻的后台采集循环，HTTP / WebSocket 只读
缓存，不在请求路径上触发现场采集。

## 目录结构

```
src/
  main.rs              程序入口 + 组合根：解析配置 → 启动 5 个后台采集循环 → 启动 server
  config.rs            Config：监听地址（env 可覆盖）+ 各采集器的间隔/超时，集中调参
  state.rs             AppState（每个 collector 的只读句柄，纯数据持有者）+ FullSnapshot
  scheduler.rs         BackgroundCollector<C>：常驻循环 + 超时保护 + 缓存
  collectors/
    mod.rs              Collector trait
    cpu.rs              基于 sysinfo，内部持有长期存活的 System 实例
    mem.rs              基于 sysinfo
    disk.rs             基于 sysinfo::Disks
    docker.rs           基于 bollard，真异步，采集镜像/容器列表信息
    gpu.rs              基于 nvml-wrapper，spawn_blocking + 单卡熔断；含每卡 compute 进程列表
    process.rs          进程总数 + CPU/内存 Top N（不推全量进程列表）
  api/
    mod.rs              路由组装
    rest.rs              REST handler，全部只读缓存
    ws.rs                WebSocket 推送，按固定节奏广播全量快照
    sse.rs               SSE 推送，WS 的单向轻量替代（自动重连），同样的全量快照
```

分层职责：采集实现（collectors）不知道自己在被谁调度；调度（scheduler）
不知道采集的是什么；状态（state）不知道任务怎么启动；启动顺序和参数
（main + config）不知道任何采集细节。改动其中一层不影响其他层。

## 运行

```
cargo run
```

默认监听 `0.0.0.0:8080`，可用环境变量覆盖：

```
SYSTEM_MONITOR_ADDR=127.0.0.1:9090 cargo run
```

采集间隔/超时集中在 `src/config.rs` 的 `Config::default()` 里调整。

```
curl http://localhost:8080/api/v1/metrics
curl http://localhost:8080/api/v1/metrics/gpu
```

WebSocket 实时流：`ws://localhost:8080/ws/metrics`，每秒推送一次全量快照。

SSE 实时流：`http://localhost:8080/sse/metrics`，同样的快照和节奏，
单向 `text/event-stream`，浏览器 `EventSource` 直接可用：

```
curl -N http://localhost:8080/sse/metrics
```

## 数据新鲜度：collectedAtUnixMs

REST / WS / SSE 的 JSON 输出统一 camelCase。每项指标都带
`collectedAtUnixMs` 字段，表示"这份数据什么时候采到的"
（不是"响应什么时候生成的"）：

```json
{"collectedAtUnixMs": 1753932000123, "globalUsagePercent": 22.3, "loadAvg1": 1.85, ...}
```

- 采集失败/超时保留旧缓存时，时间戳也保留旧的——客户端用它判断数据
  是否过期，而不是误以为拿到了新数据。
- SSE/WS 每秒推一帧，但 disk 5s 才采一轮，重复的帧靠这个时间戳去重。
- 值为 `0` 是哨兵：进程启动后还没成功采到任何一轮（或该 collector
  一直失败，比如 docker socket 连不上）。

## 几个关键设计，对应之前讨论过的问题

**1. 为什么是常驻 loop 而不是按需触发**
GPU 满载时 NVML 查询本身会变慢，如果查询是被 HTTP 请求触发的（按需模式），
恰恰会在用户最需要看数据的时候撞上最慢的一次采集。常驻 loop 让采集和
请求解耦：接口永远只读缓存，哪怕后台采集这一轮因为 GPU/Docker 慢而没
按时更新，用户拿到的也是"稍微旧一点但立刻能给"的数据，而不是干等。

**2. 为什么 GPU 采集要套 `spawn_blocking`，Docker 不用**
`nvml-wrapper` 底层是同步 FFI 调 NVIDIA 驱动，没有非阻塞版本，必须挪到
`spawn_blocking` 的独立线程池，否则一次慢查询会占住 tokio 的 async worker
线程，连带拖慢 axum 处理其他请求。`bollard` 走的是异步 hyper 客户端，
`.await` 本身就是非阻塞的，不需要 `spawn_blocking`，只需要 timeout 防止
daemon 慢拖累响应时间。

**3. 为什么 GPU 采集是并发查询每张卡、而不是一个循环里顺序 await**
如果顺序 await，一张卡的查询卡住会连带拖慢其他卡本轮的查询——即使它们
分别跑在 spawn_blocking 的不同线程上，因为 collect() 这个 async 函数
本身要顺序等它们完成。改成 `futures_util::future::join_all` 并发发起，
配合每张卡各自的超时，才能做到真正的"一张卡坏了不影响其他卡"。

**4. 熔断（circuit breaker）解决的是什么**
NVML 的同步调用一旦真的被驱动层面挂起，`spawn_blocking` 里那个线程会
一直占着，直到（如果）驱动自己恢复——这个调用本质上无法被"取消"。如果
每一轮轮询都对一张已知会卡住的卡重新发起调用，会持续新增被占用的线程，
早晚耗尽阻塞线程池。`gpu.rs` 里 `consecutive_failures` 超过阈值后暂停
对这张卡发起新调用，就是为了防止这种线程泄漏累积。

## 已知需要你在编译时核对的几处（没有联网环境无法帮你实跑 `cargo build`）

以下几个第三方库的 API 在不同小版本之间调整得比较频繁，如果编译报错，
大概率是这几处字段名/方法名要对照你实际锁定的版本调整，语义和整体架构
不受影响：

- `sysinfo`：`Disk::file_system()` 的返回类型在不同版本里是
  `&str` / `&[u8]` / `&OsStr`，`disk.rs` 里假设的是 `&OsStr`。
- `bollard`：`ImageSummary` 的字段是否带 `Option` 包装、`ListImagesOptions` /
  `ListContainersOptions` 的字段名，在不同版本里变过；`docker.rs` 里假设的
  是 0.16 的形态（`ImageSummary.repo_tags: Vec<String>` 等）。
- `nvml-wrapper`：`enum_wrappers::device::TemperatureSensor` 的模块路径、
  以及 `utilization_rates()` 返回结构体的字段名，建议对照你锁定版本的
  docs.rs 页面核对一次。

## 还没做、但值得后续加上的

- 历史曲线（目前只有"当前值"，没有短期时序缓存）。
- Prometheus `/metrics` 导出端点（如果要接 Grafana，加一个新 handler，
  直接从 `AppState` 里读缓存注册 Gauge 即可，采集调度不用变）。
- 鉴权中间件（如果你现有的 axum 项目已经有 JWT 中间件，直接挂到
  `/api/*` 路由组上即可复用）。

use std::time::Duration;

/// 单个采集器的调度参数。
#[derive(Clone, Copy, Debug)]
pub struct CollectorSpec {
    /// 常驻采集循环的 tick 间隔。
    pub poll_interval: Duration,
    /// 单次 collect() 的超时；超时后跳过本轮、保留上一次缓存值，
    /// 下一轮 tick 再试。必须小于对应采集器内部的细分超时之和，
    /// 否则外层保护失去意义（见 gpu 的注释）。
    pub collect_timeout: Duration,
}

/// 进程级配置，组合根（main.rs）的唯一输入。
///
/// 监听地址通过环境变量 `SYSTEM_MONITOR_ADDR` 覆盖；采集调度参数
/// 不走环境变量，直接改 `Config::default()`——这些值之间有相互
/// 约束（外层超时与内层超时的大小关系），集中在一处审阅比散在
/// 一堆 env 里安全。
#[derive(Clone, Debug)]
pub struct Config {
    pub listen_addr: String,
    pub cpu: CollectorSpec,
    pub mem: CollectorSpec,
    pub disk: CollectorSpec,
    pub docker: CollectorSpec,
    pub gpu: CollectorSpec,
    pub process: CollectorSpec,
}

impl Config {
    pub fn from_env() -> Self {
        let mut cfg = Self::default();
        if let Ok(addr) = std::env::var("APP_ADDR") {
            cfg.listen_addr = addr;
        }
        cfg
    }
}

/// 采集频率按"数据变化快慢 + 采集成本"分开配置：
/// - CPU/内存：变化快、采集便宜，1s 一次。
/// - 磁盘：变化慢，5s 一次足够，减少不必要的系统调用。
/// - GPU：采集成本更高（FFI 调用），2s 一次，叠加超时保护。
/// - Docker：镜像/容器变化很慢，而列表调用带 size 统计要遍历容器
///   可写层，数量多时很重，10s 一次。
/// - 进程：枚举要扫全量 /proc/<pid>，成本比 mem 高一个量级，2s 一次。
impl Default for Config {
    fn default() -> Self {
        Self {
            listen_addr: "0.0.0.0:1000".into(),
            cpu: CollectorSpec {
                poll_interval: Duration::from_millis(1000),
                collect_timeout: Duration::from_millis(800),
            },
            mem: CollectorSpec {
                poll_interval: Duration::from_millis(1000),
                collect_timeout: Duration::from_millis(800),
            },
            disk: CollectorSpec {
                poll_interval: Duration::from_secs(5),
                collect_timeout: Duration::from_secs(3),
            },
            docker: CollectorSpec {
                poll_interval: Duration::from_mins(30),
                collect_timeout: Duration::from_mins(10),
            },
            gpu: CollectorSpec {
                poll_interval: Duration::from_secs(2),
                // 外层超时要略大于 gpu.rs 内部单卡的 500ms 超时，给
                // "多张卡并发查询"留出汇总的时间，但也不能太宽松，
                // 否则失去了外层保护的意义。
                collect_timeout: Duration::from_millis(1500),
            },
            process: CollectorSpec {
                // 进程枚举要扫全量 /proc/<pid>，成本比 mem 高一个量级，
                // 且 Top N 榜单不需要秒级精度，2s 一次。
                poll_interval: Duration::from_secs(2),
                collect_timeout: Duration::from_secs(1),
            },
        }
    }
}

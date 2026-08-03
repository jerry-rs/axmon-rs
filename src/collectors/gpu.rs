use async_trait::async_trait;
use serde::Serialize;
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Arc;
use std::time::Duration;
use sysinfo::{Pid, ProcessRefreshKind, ProcessesToUpdate, RefreshKind, System};
use tokio::sync::Mutex;

use nvml_wrapper::enum_wrappers::device::TemperatureSensor;
use nvml_wrapper::enums::device::UsedGpuMemory;
use nvml_wrapper::error::NvmlError;
use nvml_wrapper::Nvml;

use super::Collector;

#[derive(Serialize, Clone, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct GpuProcessInfo {
    pub pid: u32,
    /// 进程名。NVML 枚举到 sysinfo 解析这几毫秒之间进程退出时为空字符串。
    pub name: String,
    /// 该进程占用的 GPU 显存（VRAM）。Windows WDDM 下驱动不暴露按进程的
    /// 显存占用（NVML 返回 N/A），用 None 而不是 0——0 会跟"真没占显存"混淆。
    pub gpu_mem_bytes: Option<u64>,
    /// CPU 利用率（100 = 占满一个核，多线程可超 100），sysinfo 按采集
    /// 轮次差分得出。新出现的进程第一轮没有基线，值为 0，下一轮起正常。
    pub cpu_percent: f32,
    /// 主机侧（CPU）物理内存（RSS）；cpu_ 前缀跟 gpu_mem_bytes 对称，
    /// 语义跟 ProcessInfo.mem_bytes 一致。
    pub cpu_mem_bytes: u64,
    /// 主机侧（CPU）虚拟内存（VSZ）。
    pub cpu_virtual_mem_bytes: u64,
    /// 进程所在容器的完整 ID（64 位 hex），从 /proc/<pid>/cgroup 解析；
    /// 裸机进程、或读取的间隙进程已退出时为 None。容器名不在后端 join——
    /// 前端拿 docker 指标按 ID 前缀匹配，保持 collector 之间零耦合。
    pub container_id: Option<String>,
}

#[derive(Serialize, Clone, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct GpuInfo {
    pub index: u32,
    pub name: String,
    pub utilization_percent: u32,
    pub mem_used_bytes: u64,
    pub mem_total_bytes: u64,
    /// mem_used / mem_total，nvidia-smi "Memory-Usage" 栏的百分比口径。
    /// unhealthy 的卡此值为 0（整条 GpuInfo 都是默认值，以 healthy 为准）。
    pub mem_usage_percent: f32,
    pub temperature_c: u32,
    /// 这张卡上的 compute 进程，按显存占用降序，对应 nvidia-smi 的
    /// "Processes" 一栏。只查 compute 不查 graphics（Xorg 之类）——
    /// 这是给无头 GPU 服务器用的监控，图形进程不是关注对象，还省一次
    /// FFI 调用。unhealthy 的卡此字段为空数组。
    pub processes: Vec<GpuProcessInfo>,
    pub healthy: bool,
    pub error: Option<String>,
}

#[derive(Serialize, Clone, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct GpuMetric {
    pub gpus: Vec<GpuInfo>,
    /// 没有 NVIDIA 驱动 / 没有 NVML 库 / 初始化失败时是 false，
    /// 这种情况不当错误处理，只是这台机器没有可监控的 NVIDIA GPU。
    pub available: bool,
}

/// 单张卡连续失败次数达到这个阈值后，进入熔断：本轮直接跳过，不再对它
/// 发起新的 NVML 调用。原因见下面 query_device_guarded 的注释——NVML
/// 的调用是同步 FFI，一旦某张卡的驱动挂起，对应的 spawn_blocking 线程
/// 可能永久拿不回来，熔断是为了不让每一轮轮询都新泄漏一个线程。
const BACKOFF_THRESHOLD: u32 = 3;

struct DeviceHealth {
    consecutive_failures: AtomicU32,
}

pub struct GpuCollector {
    nvml: Option<Arc<Nvml>>,
    device_health: Mutex<Vec<DeviceHealth>>,
    /// 只为补 GPU 进程的 OS 侧信息（name / cpu / 内存，见
    /// fill_process_details）而存在：
    /// 空的 System，从不做全量刷新，每轮只按 PID 定向补几条 /proc 记录。
    /// 刻意不复用 ProcessCollector 那份全量 System——collector 之间零耦合
    /// 是刻意的分层约定（见 disk.rs 的说明），共享可变状态恰恰是最深的耦合。
    sys: Mutex<System>,
}

impl GpuCollector {
    pub fn new() -> Self {
        let nvml = Nvml::init().ok().map(Arc::new);
        let count = nvml
            .as_ref()
            .and_then(|n| n.device_count().ok())
            .unwrap_or(0);
        let device_health = (0..count)
            .map(|_| DeviceHealth {
                consecutive_failures: AtomicU32::new(0),
            })
            .collect();

        Self {
            nvml,
            device_health: Mutex::new(device_health),
            sys: Mutex::new(System::new_with_specifics(RefreshKind::nothing())),
        }
    }

    /// NVML 只给 PID，进程名、CPU/内存指标和容器 ID 都要从 OS 侧补。
    /// 在所有卡的 NVML 查询都结束后统一做一次：join_all 之前补会拖长每张卡的
    /// guarded 窗口，而按 PID 定向刷新就几条 /proc 记录，同步做的成本
    /// 可以忽略，不需要 spawn_blocking。解析失败（进程刚好退出、权限
    /// 不足）就留默认值，不视为采集失败。
    async fn fill_process_details(&self, gpus: &mut [GpuInfo]) {
        let mut pids: Vec<Pid> = gpus
            .iter()
            .flat_map(|g| g.processes.iter().map(|p| Pid::from_u32(p.pid)))
            .collect();
        if pids.is_empty() {
            return;
        }
        // 同一个进程可以同时占多张卡，跨卡去重后再刷新。
        pids.sort_unstable();
        pids.dedup();

        let mut sys = self.sys.lock().await;
        // 进程名是基础信息每次必取；CPU 利用率和 RSS/VSZ 要显式开。
        // cpu_percent 靠同一份 sys 跨轮复用：sysinfo 的进程 CPU 是
        // 相对上一次刷新的差分，每轮换一份新的 System 会永远是 0。
        // 0.32 起 refresh_pids_specifics 并入 refresh_processes_specifics：
        // 显式给 PID 集合和"清理已死进程"开关。
        sys.refresh_processes_specifics(
            ProcessesToUpdate::Some(&pids),
            true,
            ProcessRefreshKind::nothing().with_cpu().with_memory(),
        );

        for p in gpus.iter_mut().flat_map(|g| g.processes.iter_mut()) {
            if let Some(proc_) = sys.process(Pid::from_u32(p.pid)) {
                p.name = proc_.name().to_string_lossy().into_owned();
                p.cpu_percent = proc_.cpu_usage();
                p.cpu_mem_bytes = proc_.memory();
                p.cpu_virtual_mem_bytes = proc_.virtual_memory();
            }
            // 同一进程占多张卡时会重复读几次这个小文件，成本可忽略。
            p.container_id = parse_container_id(p.pid);
        }
    }
}

/// 从 /proc/<pid>/cgroup 提取进程所在的容器 ID。ID 在 cgroup 路径里的
/// 形态随 runtime 而变：systemd scope 是 docker-/cri-containerd-/crio-/
/// libpod- 前缀加 .scope，cgroupfs 是 /docker/<id> 裸路径，k8s 还会再
/// 嵌一层 kubepods——共同点是一段 64 位十六进制，按字符特征扫描比逐
/// runtime 枚举模式更耐变化。非容器进程的路径里没有这种串，天然
/// 返回 None；文件读不到（进程刚好退出）同样 None，不视为采集失败。
fn parse_container_id(pid: u32) -> Option<String> {
    let content = std::fs::read_to_string(format!("/proc/{pid}/cgroup")).ok()?;
    let id = content
        .split(|c: char| !c.is_ascii_hexdigit())
        .find(|s| s.len() == 64)?;
    Some(id.to_string())
}

impl Default for GpuCollector {
    fn default() -> Self {
        Self::new()
    }
}

/// 真正跟 NVML 打交道的同步函数，必须整个跑在 spawn_blocking 里，
/// 因为 nvml-wrapper 底层是同步 FFI，没有非阻塞版本。
fn query_one_device_sync(nvml: &Nvml, index: u32) -> Result<GpuInfo, NvmlError> {
    let device = nvml.device_by_index(index)?;
    let name = device.name()?;
    let util = device.utilization_rates()?;
    let mem = device.memory_info()?;
    let temp = device.temperature(TemperatureSensor::Gpu)?;

    // 进程枚举失败不用 `?` 传播：NotSupported 之类的错误只意味着这次
    // 拿不到进程列表，而名字/利用率/显存/温度都查到了，卡本身是健康的，
    // 整条标 unhealthy 反而丢数据。驱动真挂起的情况由外层超时 + 熔断
    // 兜底（这个调用同样跑在 spawn_blocking + timeout 里），不靠这里。
    let mut processes: Vec<GpuProcessInfo> = device
        .running_compute_processes()
        .map(|ps| {
            ps.into_iter()
                .map(|p| GpuProcessInfo {
                    pid: p.pid,
                    gpu_mem_bytes: match p.used_gpu_memory {
                        UsedGpuMemory::Used(bytes) => Some(bytes),
                        UsedGpuMemory::Unavailable => None,
                    },
                    // name / cpu / 内存这里都拿不到（NVML 只给 PID），
                    // 统一由 fill_process_details 在所有卡查询结束后补齐。
                    ..Default::default()
                })
                .collect()
        })
        .unwrap_or_default();
    // 按显存占用降序，"谁在占卡"的视角；None（驱动不报告）自然排最后。
    processes.sort_by(|a, b| b.gpu_mem_bytes.cmp(&a.gpu_mem_bytes));

    Ok(GpuInfo {
        index,
        name,
        utilization_percent: util.gpu,
        mem_used_bytes: mem.used,
        mem_total_bytes: mem.total,
        mem_usage_percent: percent(mem.used, mem.total),
        temperature_c: temp,
        processes,
        healthy: true,
        error: None,
    })
}

/// percent 的第三份副本（另两份在 mem.rs / disk.rs）——collector 之间
/// 保持零耦合是刻意的分层约定，见 disk.rs 里的说明。
fn percent(part: u64, total: u64) -> f32 {
    // 分母为 0 退成 0：serde_json 会把 NaN 静默序列化成 null，退成 0 更明确。
    // （f64 没有 checked_div，浮点 checked 运算的 RFC 未进 std，只能手动判断。）
    if total == 0 {
        0.0
    } else {
        (part as f64 / total as f64 * 100.0) as f32
    }
}

/// 单张卡的"带熔断 + 超时"查询。这是整个 GPU collector 里最关键的一段：
///
/// - 熔断检查：这张卡最近连续失败次数超过阈值，直接跳过，不发起新调用。
/// - spawn_blocking：把同步 FFI 调用挪出 async worker 线程。
/// - 超时：如果这次调用（含 spawn_blocking 排队）超过 per_device_timeout
///   还没回来，我们不再等待，把这张卡标记为 unhealthy 并继续处理其他卡。
///   注意，这只是"我们不再等它"，不是"真的取消了它"——如果驱动层面
///   确实卡死，spawn_blocking 里那个线程会一直占着，直到（如果）驱动
///   自己恢复为止。这是 NVML 同步调用无法被取消的本质限制，熔断机制
///   的作用是防止同一张坏卡反复触发新的、大概率也会卡住的调用。
async fn query_device_guarded(
    nvml: Arc<Nvml>,
    index: u32,
    health: &Mutex<Vec<DeviceHealth>>,
    per_device_timeout: Duration,
) -> GpuInfo {
    let should_skip = {
        let h = health.lock().await;
        h[index as usize]
            .consecutive_failures
            .load(Ordering::Relaxed)
            >= BACKOFF_THRESHOLD
    };
    if should_skip {
        return GpuInfo {
            index,
            healthy: false,
            error: Some("suspected hung, backing off".into()),
            ..Default::default()
        };
    }

    let nvml_for_task = nvml.clone();
    let handle = tokio::task::spawn_blocking(move || query_one_device_sync(&nvml_for_task, index));

    let outcome = match tokio::time::timeout(per_device_timeout, handle).await {
        Ok(Ok(Ok(info))) => info,
        Ok(Ok(Err(e))) => GpuInfo {
            index,
            healthy: false,
            error: Some(e.to_string()),
            ..Default::default()
        },
        Ok(Err(join_err)) => GpuInfo {
            index,
            healthy: false,
            error: Some(format!("task panicked: {join_err}")),
            ..Default::default()
        },
        Err(_elapsed) => GpuInfo {
            index,
            healthy: false,
            error: Some("nvml call timed out, device may be hung".into()),
            ..Default::default()
        },
    };

    let h = health.lock().await;
    if outcome.healthy {
        h[index as usize]
            .consecutive_failures
            .store(0, Ordering::Relaxed);
    } else {
        h[index as usize]
            .consecutive_failures
            .fetch_add(1, Ordering::Relaxed);
    }

    outcome
}

#[async_trait]
impl Collector for GpuCollector {
    type Metric = GpuMetric;

    async fn collect(&self) -> anyhow::Result<GpuMetric> {
        let Some(nvml) = self.nvml.clone() else {
            return Ok(GpuMetric {
                gpus: Vec::new(),
                available: false,
            });
        };

        let count = self.device_health.lock().await.len() as u32;
        let per_device_timeout = Duration::from_millis(500);

        // 并发查询所有卡，而不是 for 循环里一个个 await——这样即使某张卡
        // 卡住，也不会拖慢其他卡本轮的查询进度，各卡互相隔离。
        let futs = (0..count).map(|index| {
            query_device_guarded(nvml.clone(), index, &self.device_health, per_device_timeout)
        });
        let mut gpus = futures_util::future::join_all(futs).await;

        self.fill_process_details(&mut gpus).await;

        Ok(GpuMetric {
            gpus,
            available: true,
        })
    }

    fn name(&self) -> &'static str {
        "gpu"
    }
}

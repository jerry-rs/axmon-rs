use async_trait::async_trait;
use serde::Serialize;
use sysinfo::{CpuRefreshKind, RefreshKind, System};
use tokio::sync::Mutex;

use super::Collector;

#[derive(Serialize, Clone, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CpuMetric {
    /// 整机使用率（0-100），取自 sysinfo 的全局 CPU 行（/proc/stat
    /// 的聚合 "cpu" 行），不是 per_core 的算术平均——聚合行是按各核
    /// 实际节拍数加权的，比平均更准。
    pub global_usage_percent: f32,
    pub per_core_usage_percent: Vec<f32>,
    /// 1/5/15 分钟系统负载均值。load average 是 Unix 概念，
    /// Windows 上 sysinfo 恒返回 0，客户端应按平台忽略这组字段。
    pub load_avg_1: f64,
    pub load_avg_5: f64,
    pub load_avg_15: f64,
}

/// CPU 采集器内部持有一个长期存活的 `System` 实例。
///
/// sysinfo 计算 CPU 使用率靠的是"这次刷新"和"上次刷新"之间的差值，
/// 所以这个 struct 不能每次 collect() 都新建一个 System —— 必须复用
/// 同一个实例，多次调用之间才有意义。因为组合根（main.rs::spawn_collectors）
/// 保证同一个 CpuCollector 只会在进程生命周期内构造一次、被 BackgroundCollector
/// 反复 collect()，这个前提是成立的。
pub struct CpuCollector {
    sys: Mutex<System>,
}

impl CpuCollector {
    pub fn new() -> Self {
        // 只装载 CPU 部分：new_all() 还会扫进程/内存/磁盘等一堆这个
        // collector 用不到的信息。new_with_specifics 构造时即完成第一次
        // 刷新建立基线，所以第一轮 collect 的差值就有效。
        let sys = System::new_with_specifics(
            RefreshKind::nothing().with_cpu(CpuRefreshKind::nothing().with_cpu_usage()),
        );
        Self {
            sys: Mutex::new(sys),
        }
    }
}

impl Default for CpuCollector {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl Collector for CpuCollector {
    type Metric = CpuMetric;

    async fn collect(&self) -> anyhow::Result<CpuMetric> {
        let mut sys = self.sys.lock().await;
        sys.refresh_cpu_usage();

        let per_core: Vec<f32> = sys.cpus().iter().map(|c| c.cpu_usage()).collect();
        // 0.33 起 global_cpu_info()（返回 &Cpu）换成了 global_cpu_usage()，直接给 f32。
        let global_usage_percent = sys.global_cpu_usage();

        let load = System::load_average();

        Ok(CpuMetric {
            global_usage_percent,
            per_core_usage_percent: per_core,
            load_avg_1: load.one,
            load_avg_5: load.five,
            load_avg_15: load.fifteen,
        })
    }

    fn name(&self) -> &'static str {
        "cpu"
    }
}

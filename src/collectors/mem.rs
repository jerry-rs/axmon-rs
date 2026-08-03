use async_trait::async_trait;
use serde::Serialize;
use sysinfo::{MemoryRefreshKind, RefreshKind, System};
use tokio::sync::Mutex;

use super::Collector;

#[derive(Serialize, Clone, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MemMetric {
    pub total_bytes: u64,
    pub used_bytes: u64,
    pub available_bytes: u64,
    /// 等于 used_bytes / total_bytes，预算是为了方便告警/仪表盘直接
    /// 取数。想要"含可回收缓存"口径（availableBytes）的客户端可以
    /// 自己换算，两种口径的分歧主要在 Linux page cache 上。
    pub usage_percent: f32,
    pub swap_total_bytes: u64,
    pub swap_used_bytes: u64,
    pub swap_free_bytes: u64,
    /// swap_used_bytes / swap_total_bytes。没配置 swap 的机器
    /// （swap_total = 0）恒为 0，不会输出 NaN。
    pub swap_usage_percent: f32,
}

/// 内存不像 CPU 那样需要跨调用的差值，理论上每次可以用一个临时的
/// System，但复用同一个实例开销更小（避免每次都重新分配内部结构），
/// 所以这里沿用和 CpuCollector 一样的模式。
///
/// 初始化用 new_with_specifics 而不是 new_all：new_all 会把 CPU 列表、
/// 全部进程、组件温度等一并拉起来，而这个实例只服务于 refresh_memory()，
/// 只声明加载内存部分，省掉进程枚举这类无关开销。
pub struct MemCollector {
    sys: Mutex<System>,
}

impl MemCollector {
    pub fn new() -> Self {
        let sys = System::new_with_specifics(
            RefreshKind::nothing().with_memory(MemoryRefreshKind::everything()),
        );
        Self { sys: Mutex::new(sys) }
    }
}

impl Default for MemCollector {
    fn default() -> Self {
        Self::new()
    }
}

/// 分母为 0 时必须返回 0 而不是让除法产生 NaN——serde_json 会把
/// 非有限浮点序列化成 null，NaN 不会报错而是静默变成 null 字段，
/// 客户端看到 null 会比看到 0 困惑得多。
/// （f64 没有 checked_div，浮点 checked 运算的 RFC 未进 std，只能手动判断。）
fn percent(part: u64, total: u64) -> f32 {
    if total == 0 {
        0.0
    } else {
        (part as f64 / total as f64 * 100.0) as f32
    }
}

#[async_trait]
impl Collector for MemCollector {
    type Metric = MemMetric;

    async fn collect(&self) -> anyhow::Result<MemMetric> {
        let mut sys = self.sys.lock().await;
        sys.refresh_memory();

        let total = sys.total_memory();
        let used = sys.used_memory();
        let swap_total = sys.total_swap();
        let swap_used = sys.used_swap();

        Ok(MemMetric {
            total_bytes: total,
            used_bytes: used,
            available_bytes: sys.available_memory(),
            usage_percent: percent(used, total),
            swap_total_bytes: swap_total,
            swap_used_bytes: swap_used,
            swap_free_bytes: sys.free_swap(),
            swap_usage_percent: percent(swap_used, swap_total),
        })
    }

    fn name(&self) -> &'static str {
        "mem"
    }
}

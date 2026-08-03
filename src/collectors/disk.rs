use async_trait::async_trait;
use serde::Serialize;
use sysinfo::Disks;

use super::Collector;

#[derive(Serialize, Clone, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DiskInfo {
    pub name: String,
    pub mount_point: String,
    pub file_system: String,
    pub total_bytes: u64,
    pub available_bytes: u64,
    /// (total - available) / total。available 已扣除 ext4 之类的
    /// root 保留块，所以这个百分比就是 df 里 Use% 的口径。
    /// total 为 0 的虚拟文件系统（procfs 等）恒为 0，不出 NaN。
    pub usage_percent: f32,
}

#[derive(Serialize, Clone, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DiskMetric {
    pub disks: Vec<DiskInfo>,
}

/// 磁盘列表变化不频繁（挂载/卸载才会变），每次现场枚举一次即可，
/// 不需要像 CPU 那样维护跨调用的状态，所以这个 collector 本身无状态。
pub struct DiskCollector;

impl DiskCollector {
    pub fn new() -> Self {
        Self
    }
}

impl Default for DiskCollector {
    fn default() -> Self {
        Self::new()
    }
}

/// 跟 mem.rs 里的 percent 是同一个函数的两个副本——刻意不抽公共
/// util：collector 之间保持零耦合（README 的分层约定），为这个
/// 小函数引入共享模块不划算。
fn percent(part: u64, total: u64) -> f32 {
    // 分母为 0 退成 0：serde_json 会把 NaN 静默序列化成 null，比 0 难排查。
    // （f64 没有 checked_div，浮点 checked 运算的 RFC 未进 std，只能手动判断。）
    if total == 0 {
        0.0
    } else {
        (part as f64 / total as f64 * 100.0) as f32
    }
}

#[async_trait]
impl Collector for DiskCollector {
    type Metric = DiskMetric;

    async fn collect(&self) -> anyhow::Result<DiskMetric> {
        // Disks::new_with_refreshed_list() 本身是同步调用，正常情况下很快
        // （本地磁盘走的是 statvfs 级别的系统调用）。如果你们的磁盘里有网络
        // 文件系统（NFS/CIFS）且不稳定，这一步可能会变慢甚至卡住——届时
        // 可以参考 gpu.rs 里的隔离写法，把这一步也放进 spawn_blocking 并加超时。
        let disks = Disks::new_with_refreshed_list();

        let list = disks
            .list()
            .iter()
            .map(|d| DiskInfo {
                name: d.name().to_string_lossy().to_string(),
                mount_point: d.mount_point().to_string_lossy().to_string(),
                // sysinfo 不同版本里 file_system() 的返回类型变过几次
                // （&str / &[u8] / &OsStr），如果这里编译不过，改成对应
                // 版本的转换方式即可，语义不变。
                file_system: d.file_system().to_string_lossy().to_string(),
                total_bytes: d.total_space(),
                available_bytes: d.available_space(),
                usage_percent: percent(d.total_space() - d.available_space(), d.total_space()),
            })
            .collect();

        Ok(DiskMetric { disks: list })
    }

    fn name(&self) -> &'static str {
        "disk"
    }
}

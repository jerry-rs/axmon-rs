use async_trait::async_trait;
use serde::Serialize;

pub mod cpu;
pub mod disk;
pub mod docker;
pub mod gpu;
pub mod mem;
pub mod process;

/// 所有采集器的统一接口。
///
/// 实现要求：
/// - `collect` 只允许失败于"这次采集失败"（比如 Docker socket 连不上），
///   不应该 panic；失败时上层会保留上一次的缓存并打 warn 日志。
/// - 需要维持内部状态的采集器（比如 CPU 使用率要靠两次采样的差值）
///   把状态放在 `&self` 内部的 `Mutex` 里，因为同一个 collector 实例
///   会在整个进程生命周期内被 BackgroundCollector 反复调用。
#[async_trait]
pub trait Collector: Send + Sync + 'static {
    type Metric: Serialize + Clone + Send + Sync + Default + 'static;

    async fn collect(&self) -> anyhow::Result<Self::Metric>;

    /// 用于日志里区分是哪个采集器，纯诊断用途。
    fn name(&self) -> &'static str;
}

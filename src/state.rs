use std::sync::atomic::AtomicUsize;
use std::sync::Arc;

use serde::Serialize;

use crate::collectors::cpu::{CpuCollector, CpuMetric};
use crate::collectors::disk::{DiskCollector, DiskMetric};
use crate::collectors::docker::{DockerCollector, DockerMetric};
use crate::collectors::gpu::{GpuCollector, GpuMetric};
use crate::collectors::mem::{MemCollector, MemMetric};
use crate::collectors::netlink::{NetLinkCollector, NetLinkMetric};
use crate::collectors::process::{ProcessCollector, ProcessMetric};
use crate::scheduler::{BackgroundCollector, Timestamped};

/// 全量快照，/api/v1/metrics、WebSocket 和 SSE 推送都用这个结构。
/// 每项指标外面套着 Timestamped 信封（含 collected_at_unix_ms），
/// 序列化后时间戳与指标字段平铺在同一层。
#[derive(Serialize, Clone, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct FullSnapshot {
    pub cpu: Timestamped<CpuMetric>,
    pub mem: Timestamped<MemMetric>,
    pub disk: Timestamped<DiskMetric>,
    pub docker: Timestamped<DockerMetric>,
    pub gpu: Timestamped<GpuMetric>,
    pub process: Timestamped<ProcessMetric>,
    pub netlink: Timestamped<NetLinkMetric>,
}

/// 请求路径共享的纯数据持有者：只包含各采集器的缓存句柄，
/// 不包含任何"如何启动 / 用什么频率采集"的知识——那是组合根
/// （main.rs::spawn_collectors）和配置（config.rs）的职责。
/// 字段全部 pub，测试里可以绕开组合根直接组装。
#[derive(Clone)]
pub struct AppState {
    pub cpu: Arc<BackgroundCollector<CpuCollector>>,
    pub mem: Arc<BackgroundCollector<MemCollector>>,
    pub disk: Arc<BackgroundCollector<DiskCollector>>,
    pub docker: Arc<BackgroundCollector<DockerCollector>>,
    pub gpu: Arc<BackgroundCollector<GpuCollector>>,
    pub process: Arc<BackgroundCollector<ProcessCollector>>,
    pub netlink: Arc<BackgroundCollector<NetLinkCollector>>,
    /// 当前打开的 WebSocket 连接数，纯粹用于日志/诊断，跟采集调度无关
    /// （方案 A 里采集本来就是一直在跑的，不需要靠连接数来启停）。
    pub ws_connections: Arc<AtomicUsize>,
}

impl AppState {
    pub async fn snapshot(&self) -> FullSnapshot {
        let (cpu, mem, disk, docker, gpu, process, netlink) = tokio::join!(
            self.cpu.get(),
            self.mem.get(),
            self.disk.get(),
            self.docker.get(),
            self.gpu.get(),
            self.process.get(),
            self.netlink.get(),
        );
        FullSnapshot {
            cpu,
            mem,
            disk,
            docker,
            gpu,
            process,
            netlink,
        }
    }
}

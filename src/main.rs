mod api;
mod collectors;
mod config;
mod scheduler;
mod state;

use std::sync::atomic::AtomicUsize;
use std::sync::Arc;

use collectors::cpu::CpuCollector;
use collectors::disk::DiskCollector;
use collectors::docker::DockerCollector;
use collectors::gpu::GpuCollector;
use collectors::mem::MemCollector;
use collectors::process::ProcessCollector;
use config::Config;
use scheduler::BackgroundCollector;
use state::AppState;
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;
use tracing_subscriber::Layer;

#[tokio::main(flavor = "multi_thread", worker_threads = 4)]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::fmt::layer()
                .with_ansi_sanitization(true)
                .with_file(true)
                .with_line_number(true)
                .pretty()
                .with_filter(
                    tracing_subscriber::EnvFilter::try_from_default_env()
                        .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
                ),
        )
        .init();

    // 组合根三段式：解析配置 → 启动采集 → 启动服务。
    let config = Config::from_env();
    let state = spawn_collectors(&config);
    let app = api::build_router(state);

    let listener = tokio::net::TcpListener::bind(&config.listen_addr).await?;
    tracing::info!(addr = %config.listen_addr, "axmon listening");

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;
    tracing::info!("graceful shutdown complete");
    Ok(())
}

async fn shutdown_signal() {
    use tokio::signal::unix::{signal, SignalKind};

    let mut sigint = signal(SignalKind::interrupt()).expect("install SIGINT handler");
    let mut sigterm = signal(SignalKind::terminate()).expect("install SIGTERM handler");

    tokio::select! {
        _ = sigint.recv() => tracing::info!(signal = "SIGINT", "starting graceful shutdown"),
        _ = sigterm.recv() => tracing::info!(signal = "SIGTERM", "starting graceful shutdown"),
    }

    // 优雅停机期间再收到任一信号 → 立即强杀，不再等。
    // 必须放在独立 task 里：shutdown_signal 这个 future 一返回，
    // 优雅停机才开始，阻塞在这里等第二信号会让停机永远不开始。
    tokio::spawn(async move {
        let (name, code) = tokio::select! {
            _ = sigint.recv() =>  ("SIGINT", 130),
            _ = sigterm.recv() =>  ("SIGTERM", 143),
        };
        tracing::warn!(
            signal = name,
            exit_code = code,
            "second signal received, forcing exit"
        );
        std::process::exit(1);
    });
}

/// 方案 A 的组合根：为每个 collector 起一个常驻的后台采集循环，
/// 把只读句柄组装成 AppState 返回。
///
/// 调用契约（类型签名表达不出来，靠这里写明）：
/// - 必须在 tokio 运行时上下文中调用（内部 tokio::spawn）；
/// - 进程生命周期内只应调用一次，重复调用会起重复的后台循环。
fn spawn_collectors(config: &Config) -> AppState {
    AppState {
        cpu: BackgroundCollector::spawn(
            CpuCollector::new(),
            config.cpu.poll_interval,
            config.cpu.collect_timeout,
        ),
        mem: BackgroundCollector::spawn(
            MemCollector::new(),
            config.mem.poll_interval,
            config.mem.collect_timeout,
        ),
        disk: BackgroundCollector::spawn(
            DiskCollector::new(),
            config.disk.poll_interval,
            config.disk.collect_timeout,
        ),
        docker: BackgroundCollector::spawn(
            DockerCollector::new(),
            config.docker.poll_interval,
            config.docker.collect_timeout,
        ),
        gpu: BackgroundCollector::spawn(
            GpuCollector::new(),
            config.gpu.poll_interval,
            config.gpu.collect_timeout,
        ),
        process: BackgroundCollector::spawn(
            ProcessCollector::new(),
            config.process.poll_interval,
            config.process.collect_timeout,
        ),
        ws_connections: Arc::new(AtomicUsize::new(0)),
    }
}

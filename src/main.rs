use crate::config::AppConfig;
use crate::routers::build_global_routers;
use crate::state::AppState;
use tracing::info;
use tracing_subscriber::Layer;
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;

mod config;
mod cpu;
mod disk;
mod docker;
mod gpu;
mod home;
mod mem;
mod process;
mod routers;
mod state;

#[global_allocator]
static GLOBAL: mimalloc::MiMalloc = mimalloc::MiMalloc;

#[tokio::main(flavor = "multi_thread", worker_threads = 8)]
async fn main() {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::fmt::layer()
                .with_line_number(true)
                .with_ansi_sanitization(true)
                .pretty()
                .with_filter(
                    tracing_subscriber::EnvFilter::try_from_default_env()
                        .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
                ),
        )
        .with({
            #[cfg(feature = "tokio-console")]
            {
                console_subscriber::ConsoleLayer::builder()
                    .server_addr("0.0.0.0:5555".parse::<std::net::SocketAddr>().unwrap())
                    .spawn()
            }
            #[cfg(not(feature = "tokio-console"))]
            {
                tracing_subscriber::layer::Identity::new()
            }
        })
        .init();

    let app_config = AppConfig::default();
    info!("{app_config:#?}");

    // docker client
    let docker_client = bollard::Docker::connect_with_local_defaults().ok();

    let app_state = AppState { docker_client };
    let app_routers = build_global_routers(app_state);
    let app_addr = format!("{}:{}", &app_config.ipv4, &app_config.port);
    let app_listener = tokio::net::TcpListener::bind(app_addr)
        .await
        .expect("TcpListener Bind Error");
    info!(
        "Listening on (http or https)://{}:{}{}",
        local_ip_address::local_ip()
            .map(|ip| ip.to_string())
            .unwrap_or_else(|_| app_config.ipv4),
        app_config.port,
        if cfg!(feature = "tokio-console") {
            " and tokio console on :5555"
        } else {
            ""
        }
    );
    axum::serve(app_listener, app_routers)
        .await
        .expect("Axmon Server Error");
}

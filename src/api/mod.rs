use axum::routing::get;
use axum::Router;

use crate::state::AppState;

mod assets;
mod rest;
mod sse;
mod ws;

pub fn build_router(state: AppState) -> Router {
    Router::new()
        .route("/api/v1/metrics/cpu", get(rest::get_cpu))
        .route("/api/v1/metrics/mem", get(rest::get_mem))
        .route("/api/v1/metrics/disk", get(rest::get_disk))
        .route("/api/v1/metrics/docker", get(rest::get_docker))
        .route("/api/v1/metrics/gpu", get(rest::get_gpu))
        .route("/api/v1/metrics/process", get(rest::get_process))
        .route("/api/v1/metrics/netlink", get(rest::get_netlink))
        .route("/api/v1/metrics", get(rest::get_all))
        .route("/api/v1/health", get(rest::health))
        .route("/ws/metrics", get(ws::ws_handler))
        .route("/sse/metrics", get(sse::sse_handler))
        .with_state(state)
        .fallback(assets::serve_embedded)
}

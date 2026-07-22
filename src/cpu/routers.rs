use axum::Router;
use axum::routing::get;
use crate::cpu::handlers::usage::cpu_usage_handler;
use crate::cpu::handlers::stream::cpu_stream_handler;
use crate::state::AppState;

pub(crate) fn build_cpu_routers() ->Router<AppState>{
    Router::new()
        .route("/api/v1/cpu/stream",get(cpu_stream_handler))
        .route("/api/v1/cpu/usage",get(cpu_usage_handler))
}
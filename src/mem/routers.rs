use crate::mem::handlers::stream::mem_stream_handler;
use crate::mem::handlers::usage::mem_usage_handler;
use crate::state::AppState;
use axum::Router;
use axum::routing::get;

pub(crate) fn build_mem_routers() -> Router<AppState> {
    Router::new()
        .route("/api/v1/mem/stream", get(mem_stream_handler))
        .route("/api/v1/mem/usage", get(mem_usage_handler))
}

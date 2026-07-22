use axum::Router;
use axum::routing::get;
use crate::gpu::handlers::stream::gpu_stream_handler;
use crate::gpu::handlers::version::gpu_version_handler;
use crate::state::AppState;

pub(crate) fn build_gpu_routers() ->Router<AppState>{
    Router::new()
        .route("/api/v1/gpu/stream",get(gpu_stream_handler))
        .route("/api/v1/gpu/version",get(gpu_version_handler))
}
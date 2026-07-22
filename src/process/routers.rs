use axum::Router;
use axum::routing::get;
use crate::process::handlers::stream::process_stream_handler;
use crate::state::AppState;

pub(crate) fn build_process_routers() ->Router<AppState>{
    Router::new()
        .route("/api/v1/process/stream",get(process_stream_handler))
}
use axum::Router;
use axum::routing::get;
use crate::disk::handlers::info::disk_info_handler;
use crate::disk::handlers::usage::{disk_usage_max_handler, disk_usage_min_handler};
use crate::state::AppState;

pub(crate) fn build_disk_routers() -> Router<AppState> {
    Router::new()
        .route("/api/v1/disk/info", get(disk_info_handler))
        .route("/api/v1/disk/usage/max", get(disk_usage_max_handler))
        .route("/api/v1/disk/usage/min", get(disk_usage_min_handler))
}
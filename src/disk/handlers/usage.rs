use axum::http::StatusCode;
use axum::Json;
use axum::response::IntoResponse;


pub(crate) async fn disk_usage_max_handler() ->impl IntoResponse{
    let mut disks =
        sysinfo::Disks::new_with_refreshed_list_specifics(sysinfo::DiskRefreshKind::everything());
    disks.refresh(true);
    let usage_max = disks
        .iter()
        .map(|d| {
            let available_space = d.available_space();
            let total_space = d.total_space();
            let used_space = total_space.saturating_sub(available_space);
            used_space as f32 / total_space as f32 * 100.0
        })
        .max_by(|a,b|a.total_cmp(b));
    (StatusCode::OK,Json(usage_max)).into_response()
}


pub(crate) async fn disk_usage_min_handler() ->impl IntoResponse{
    let mut disks =
        sysinfo::Disks::new_with_refreshed_list_specifics(sysinfo::DiskRefreshKind::everything());
    disks.refresh(true);
    let usage_min = disks
        .iter()
        .map(|d| {
            let available_space = d.available_space();
            let total_space = d.total_space();
            let used_space = total_space.saturating_sub(available_space);
            used_space as f32 / total_space as f32 * 100.0
        })
        .min_by(|a,b|a.total_cmp(b));
    (StatusCode::OK,Json(usage_min)).into_response()
}
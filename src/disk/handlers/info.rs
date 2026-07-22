use axum::Json;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use serde::Serialize;
use std::path::PathBuf;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DiskItem {
    pub(crate) name: String,
    pub(crate) file_system: String,
    pub(crate) mount_point: PathBuf,
    pub(crate) available_space: u64,
    pub(crate) used_space: u64,
    pub(crate) total_space: u64,
    pub(crate) disk_usage: f32,
}

#[derive(Serialize)]
pub(crate) struct DiskStreamResponse {
    pub(crate) timestamp: u64,
    pub(crate) disks: Vec<DiskItem>,
}

pub(crate) async fn disk_info_handler() -> impl IntoResponse {
    let mut disks =
        sysinfo::Disks::new_with_refreshed_list_specifics(sysinfo::DiskRefreshKind::everything());
    disks.refresh(true);


    let disk_items = disks
        .iter()
        .map(|d| {
            let name = d.name().to_string_lossy().into_owned();
            let file_system = d.file_system().to_string_lossy().into_owned();
            let mount_point = d.mount_point().to_owned();
            let available_space = d.available_space();
            let total_space = d.total_space();
            let used_space = total_space.saturating_sub(available_space);
            DiskItem {
                name,
                file_system,
                mount_point,
                available_space,
                used_space,
                total_space,
                disk_usage: used_space as f32 / total_space as f32 * 100f32,

            }
        })
        .collect::<Vec<_>>();
    let disk_stream_response = DiskStreamResponse {
        timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .ok()
            .map(|x| x.as_secs())
            .unwrap_or_else(|| 0),
        disks: disk_items,
    };

    (StatusCode::OK, Json(disk_stream_response)).into_response()
}

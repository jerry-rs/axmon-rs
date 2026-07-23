use axum::Json;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use serde::Serialize;

// 常见需要排除的虚拟/叠加文件系统黑名单
const IGNORED_FS: &[&str] = &[
    "overlay", "tmpfs", "devtmpfs", "squashfs", "sysfs", "proc", "cgroup", "cgroup2", "autofs",
    "devpts",
];

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DiskItem {
    pub(crate) name: String,
    pub(crate) file_system: String,
    pub(crate) mount_point: String,
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
        .filter_map(|d| {
            let file_system = d.file_system().to_string_lossy().into_owned();

            // 过滤规则 A：黑名单匹配文件系统类型
            if IGNORED_FS.contains(&file_system.as_str()) {
                return None;
            }

            let mount_point = d.mount_point().to_string_lossy().to_string();

            // 过滤规则 B：防御性匹配挂载路径（防止遗漏的容器挂载点）
            if mount_point.contains("/docker/overlay2/")
                || mount_point.contains("/containers/storage/")
            {
                return None;
            }

            let name = d.name().to_string_lossy().into_owned();

            let available_space = d.available_space();
            let total_space = d.total_space();
            let used_space = total_space.saturating_sub(available_space);

            Some(DiskItem {
                name,
                file_system,
                mount_point,
                available_space,
                used_space,
                total_space,
                disk_usage: used_space as f32 / total_space as f32 * 100f32,
            })
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

use crate::state::AppState;
use axum::extract::State;
use axum::response::sse::{Event, KeepAlive, Sse};
use serde::Serialize;
use std::collections::HashSet;
use std::convert::Infallible;
use std::time::Duration;
use tokio_stream::Stream;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct HomeStreamResponse {
    long_os_version: String,
    kernel_long_version: String,
    cpu_usage: f32,
    mem_usage: f32,
    disk_mount_point: String,
    disk_max_usage: f32,
    process_count: usize,
    gpu_max_util_usage: f32,
    gpu_max_mem_usage: f32,
    gpu_max_temperature: u32,
    docker_image_running_count: u32,
    docker_image_total_count: u32,
    docker_container_running_count: u32,
    docker_container_total_count: u32,
}

async fn get_max_disk_entry(disks: &sysinfo::Disks) -> (String, f32) {
    disks
        .iter()
        .map(|disk| {
            let usage = if disk.total_space() > 0 {
                let used = disk.total_space().saturating_sub(disk.available_space());
                (used as f32 / disk.total_space() as f32) * 100.0
            } else {
                0.0
            };
            (disk.mount_point().to_string_lossy().to_string(), usage)
        })
        .max_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal))
        .unwrap_or_else(|| ("-".to_string(), 0.0))
}

async fn get_max_gpu_entry(nvml: &Option<nvml_wrapper::Nvml>) -> (f32, f32, u32) {
    if let Some(nvm) = nvml {
        let device_count = nvm.device_count().unwrap_or(0);
        let mut max_util = 0.0f32;
        let mut max_mem = 0.0f32;
        let mut max_temp = 0u32;
        for index in 0..device_count {
            if let Ok(device) = nvm.device_by_index(index) {
                let util = device.utilization_rates().map_or(0.0, |r| r.gpu as f32);
                max_util = max_util.max(util);

                let mem_util = device.memory_info().map_or(0.0, |m| {
                    if m.total > 0 {
                        (m.used as f32 / m.total as f32) * 100.0
                    } else {
                        0.0
                    }
                });
                max_mem = max_mem.max(mem_util);

                let temp = device
                    .temperature(nvml_wrapper::enum_wrappers::device::TemperatureSensor::Gpu)
                    .unwrap_or(0);
                max_temp = max_temp.max(temp);
            }
        }
        (max_util, max_mem, max_temp)
    } else {
        (0.0, 0.0, 0)
    }
}

async fn get_docker_entry(docker: Option<&bollard::Docker>) -> (u32, u32, u32, u32) {
    if let Some(client) = docker {
        let container_opts = bollard::query_parameters::ListContainersOptions {
            all: true,
            ..Default::default()
        };
        let containers = client
            .list_containers(Some(container_opts))
            .await
            .unwrap_or_default();

        let container_total = containers.len() as u32;
        let mut container_running = 0u32;
        let mut running_image_ids = HashSet::new();

        for c in &containers {
            if let Some(bollard::models::ContainerSummaryStateEnum::RUNNING) = &c.state {
                container_running += 1;
                if let Some(img_id) = &c.image_id {
                    running_image_ids.insert(img_id);
                }
            }
        }
        let image_opts = bollard::query_parameters::ListImagesOptions {
            all: true,
            ..Default::default()
        };
        let images = client
            .list_images(Some(image_opts))
            .await
            .unwrap_or_default();
        (
            images.len() as u32,
            running_image_ids.len() as u32,
            container_total,
            container_running,
        )
    } else {
        (0, 0, 0, 0)
    }
}

pub(crate) async fn home_stream_handler(
    State(state): State<AppState>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let nvm_handle = nvml_wrapper::Nvml::init().ok();
    let stream = async_stream::stream! {
        let mut sys = sysinfo::System::new_with_specifics(
            sysinfo::RefreshKind::nothing()
                .with_cpu(sysinfo::CpuRefreshKind::everything())
                .with_memory(sysinfo::MemoryRefreshKind::everything())
                .with_processes(sysinfo::ProcessRefreshKind::nothing()),
        );
        let mut disks = sysinfo::Disks::new_with_refreshed_list();
        let long_os_version = sysinfo::System::long_os_version().unwrap_or_default();
        let kernel_long_version = sysinfo::System::kernel_long_version();

        let mut interval = tokio::time::interval(Duration::from_secs(1));
        interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);

        sys.refresh_cpu_all();

        let mut tick_count: u8 = 0;

        let (mut cached_docker_stats,mut cached_disk_stats) = tokio::join!(
            get_docker_entry(state.docker_client.as_ref()),
            get_max_disk_entry(&disks)
        );

        loop {
            let _ = interval.tick().await;

            sys.refresh_cpu_all();
            sys.refresh_memory();

            if tick_count % 5 == 0 {
                disks.refresh(true);
                sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
            }

            let cpu_usage = sys.global_cpu_usage();
            let total_mem = sys.total_memory();
            let mem_usage = if total_mem > 0 {
                (sys.used_memory() as f32 / total_mem as f32) * 100.0
            } else {
                0.0
            };
            let process_count = sys.processes().len();

            // update docker
            if tick_count >0 && tick_count % 60 == 0 {
                (cached_docker_stats,cached_disk_stats) = tokio::join!(
                    get_docker_entry(state.docker_client.as_ref()),
                    get_max_disk_entry(&disks)
                );
            }
            let (
                docker_image_total_count,
                docker_image_running_count,
                docker_container_total_count,
                docker_container_running_count,
            ) = cached_docker_stats;

            let (
                disk_mount_point,
                disk_max_usage,
            ) = cached_disk_stats.clone();

            let (
                gpu_max_util_usage,
                gpu_max_mem_usage,
                gpu_max_temperature,
            ) = get_max_gpu_entry(&nvm_handle).await;

            tick_count = tick_count.wrapping_add(1);

            let home_stream_response = HomeStreamResponse {
                long_os_version: long_os_version.clone(),
                kernel_long_version: kernel_long_version.clone(),
                cpu_usage,
                mem_usage,
                disk_mount_point,
                disk_max_usage,
                process_count,
                gpu_max_util_usage,
                gpu_max_mem_usage,
                gpu_max_temperature,
                docker_image_total_count,
                docker_image_running_count,
                docker_container_total_count,
                docker_container_running_count,
            };

            if let Ok(event) = Event::default().json_data(&home_stream_response) {
                yield Ok(event);
            }
        }
    };

    Sse::new(stream).keep_alive(KeepAlive::new().interval(Duration::from_secs(15)))
}

use axum::http::StatusCode;
use axum::response::sse::Event;
use axum::response::{IntoResponse, Sse};
use serde::Serialize;
use std::convert::Infallible;
use tokio_stream::Stream;
use tracing::error;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct GProcess {
    pid: u32,
    used_gpu_memory: u64,
    total_gpu_memory: u64,
    user: Option<String>,
    cpu_usage: Option<f32>,
    cpu_mem: Option<u64>,
    cpu_vmem: Option<u64>,
    run_time: Option<u64>,
    command: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct GpuCore {
    index: u32,
    name: String,
    brand: String,
    architecture: String,
    bus_id: String,
    util: f32,
    m_util: f32,
    temperature: u32,
    processes: Vec<GProcess>,
}

#[derive(Serialize)]
pub(crate) struct GpuStreamResponse {
    timestamp: u64,
    gpus: Vec<GpuCore>,
}

pub(crate) async fn gpu_stream_handler()
-> Result<Sse<impl Stream<Item = Result<Event, Infallible>>>, impl IntoResponse> {
    let nvm = match nvml_wrapper::Nvml::init() {
        Ok(nvm) => nvm,
        Err(e) => {
            error!("GPU NVML Init Failed: {e}");
            return Err((StatusCode::INTERNAL_SERVER_ERROR, "GPU Nvm Init Failed").into_response());
        }
    };

    let stream = async_stream::stream! {
        let mut sys = sysinfo::System::new_with_specifics(
             sysinfo::RefreshKind::nothing().with_processes(sysinfo::ProcessRefreshKind::everything()),
        );
        let users = sysinfo::Users::new_with_refreshed_list();
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(1));
        interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
        loop {
            let _ = interval.tick().await;
            sys.refresh_processes_specifics(
                sysinfo::ProcessesToUpdate::All,
                true,
                sysinfo::ProcessRefreshKind::everything(),
            );
            // users.refresh();
            let g_count = nvm.device_count()
                    .unwrap_or(0);
            let gpus = (0..g_count)
            .into_iter()
            .filter_map(|index|{
                let c_device = nvm.device_by_index(index).ok()?;
                let name = c_device.name().unwrap_or_else(|_| "Unknown".to_string());
                let brand = c_device.brand().map(|b|format!("{b:?}")).unwrap_or_default();
                let architecture = c_device.architecture().map(|arch|format!("{arch:?}")).unwrap_or_default();
                let bus_id = c_device.pci_info().map(|pci|pci.bus_id).ok().unwrap_or_default();
                let g_util = c_device.utilization_rates()
                        .map_or_else(|_| 0.0, |u| u.gpu as f32);

                let g_mem_info = c_device.memory_info().ok();
                let total_gpu_memory = g_mem_info.as_ref().map_or(0, |m| m.total);
                let g_mutil = g_mem_info.as_ref().map_or(0.0, |m| {
                        if m.total > 0 {
                            (m.used as f32 / m.total as f32) * 100.0
                        } else {
                            0.0
                        }
                    });
                let g_temperature = c_device
                        .temperature(nvml_wrapper::enum_wrappers::device::TemperatureSensor::Gpu)
                        .unwrap_or(0);

                let mut raw_processes = c_device.running_graphics_processes().unwrap_or_default();
                if let Ok(compute) = c_device.running_compute_processes() {
                        raw_processes.extend(compute);
                }

                let g_processes = raw_processes
                    .into_iter()
                    .map(|p| {
                            let pid = p.pid;
                            let used_gpu_memory = match p.used_gpu_memory {
                                nvml_wrapper::enums::device::UsedGpuMemory::Used(u) => u,
                                _ => 0,
                            };
                            let cprocess = sys.process(sysinfo::Pid::from_u32(pid));
                            let user = cprocess.and_then(|p| {
                                let uid = p.user_id().or_else(|| p.effective_user_id())?;
                                Some(
                                    users
                                        .get_user_by_id(uid)
                                        .map_or_else(|| uid.to_string(), |u| u.name().to_string()),
                                )
                            });
                            let cpu_usage = cprocess.map(|p| p.cpu_usage());
                            let cpu_mem = cprocess.map(|p| p.memory());
                            let cpu_vmem = cprocess.map(|p| p.virtual_memory());
                            let run_time = cprocess.map(|p| p.run_time());
                            let command = cprocess.map(|p| p.name().to_string_lossy().into_owned());
                            GProcess{
                                pid,
                                used_gpu_memory,
                                total_gpu_memory,
                                user,
                                cpu_usage,
                                cpu_mem,
                                cpu_vmem,
                                run_time,
                                command,
                            }
                    }).collect::<Vec<GProcess>>();
                Some(GpuCore {
                    index,
                    name,
                    brand,
                    architecture,
                    bus_id,
                    util:g_util,
                    m_util:g_mutil,
                    temperature:g_temperature,
                    processes:g_processes
                })
            })
            .collect::<Vec<_>>();

            let gpu_stream_response = GpuStreamResponse{
                timestamp:std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|t|t.as_secs())
                .unwrap_or_else(|_|0),
                gpus
            };

            if let Ok(event) = Event::default().json_data(&gpu_stream_response) {
                yield Ok(event);
            }
        }

    };

    Ok(Sse::new(stream).keep_alive(
        axum::response::sse::KeepAlive::new().interval(tokio::time::Duration::from_secs(15)),
    ))
}

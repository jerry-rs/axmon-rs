use axum::Json;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use serde::Serialize;
use tracing::error;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct GpuVersionResponse {
    driver_version: String,
    nvml_version: String,
    cuda_version: String,
}

pub(crate) async fn gpu_version_handler() -> impl IntoResponse {
    match nvml_wrapper::Nvml::init() {
        Ok(nvm) => {
            let driver_version = nvm
                .sys_driver_version()
                .unwrap_or_else(|_| "Unknown".to_string());
            let nvml_version = nvm
                .sys_nvml_version()
                .unwrap_or_else(|_| "Unknown".to_string());
            let cuda_version = nvm
                .sys_cuda_driver_version()
                .ok().map(|c| c.to_string())
                .unwrap_or("Unknown".to_string());
            let g_versions = GpuVersionResponse {
                driver_version,
                nvml_version,
                cuda_version,
            };
            (StatusCode::OK, Json(g_versions)).into_response()
        }
        Err(e) => {
            error!("{e}");
            (StatusCode::INTERNAL_SERVER_ERROR, "GPU Nvml Init Failed").into_response()
        }
    }
}

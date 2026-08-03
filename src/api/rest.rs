use axum::extract::State;
use axum::Json;

use crate::collectors::cpu::CpuMetric;
use crate::collectors::disk::DiskMetric;
use crate::collectors::docker::DockerMetric;
use crate::collectors::gpu::GpuMetric;
use crate::collectors::mem::MemMetric;
use crate::collectors::process::ProcessMetric;
use crate::scheduler::Timestamped;
use crate::state::{AppState, FullSnapshot};

pub async fn get_cpu(State(state): State<AppState>) -> Json<Timestamped<CpuMetric>> {
    Json(state.cpu.get().await)
}

pub async fn get_mem(State(state): State<AppState>) -> Json<Timestamped<MemMetric>> {
    Json(state.mem.get().await)
}

pub async fn get_disk(State(state): State<AppState>) -> Json<Timestamped<DiskMetric>> {
    Json(state.disk.get().await)
}

pub async fn get_docker(State(state): State<AppState>) -> Json<Timestamped<DockerMetric>> {
    Json(state.docker.get().await)
}

pub async fn get_gpu(State(state): State<AppState>) -> Json<Timestamped<GpuMetric>> {
    Json(state.gpu.get().await)
}

pub async fn get_process(State(state): State<AppState>) -> Json<Timestamped<ProcessMetric>> {
    Json(state.process.get().await)
}

pub async fn get_all(State(state): State<AppState>) -> Json<FullSnapshot> {
    Json(state.snapshot().await)
}

/// 存活探针：不查任何采集缓存，进程能响应就算 healthy。
pub async fn health() -> Json<serde_json::Value> {
    Json(serde_json::json!({ "status": "healthy" }))
}

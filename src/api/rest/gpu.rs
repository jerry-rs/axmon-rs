use axum::extract::State;
use axum::Json;

use crate::collectors::gpu::GpuMetric;
use crate::scheduler::Timestamped;
use crate::state::AppState;

pub async fn get_gpu(State(state): State<AppState>) -> Json<Timestamped<GpuMetric>> {
    Json(state.gpu.get().await)
}

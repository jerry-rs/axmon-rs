use axum::extract::State;
use axum::Json;

use crate::collectors::cpu::CpuMetric;
use crate::scheduler::Timestamped;
use crate::state::AppState;

pub async fn get_cpu(State(state): State<AppState>) -> Json<Timestamped<CpuMetric>> {
    Json(state.cpu.get().await)
}

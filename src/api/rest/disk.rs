use axum::extract::State;
use axum::Json;

use crate::collectors::disk::DiskMetric;
use crate::scheduler::Timestamped;
use crate::state::AppState;

pub async fn get_disk(State(state): State<AppState>) -> Json<Timestamped<DiskMetric>> {
    Json(state.disk.get().await)
}

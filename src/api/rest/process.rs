use axum::extract::State;
use axum::Json;

use crate::collectors::process::ProcessMetric;
use crate::scheduler::Timestamped;
use crate::state::AppState;

pub async fn get_process(State(state): State<AppState>) -> Json<Timestamped<ProcessMetric>> {
    Json(state.process.get().await)
}

use axum::extract::State;
use axum::Json;

use crate::collectors::mem::MemMetric;
use crate::scheduler::Timestamped;
use crate::state::AppState;

pub async fn get_mem(State(state): State<AppState>) -> Json<Timestamped<MemMetric>> {
    Json(state.mem.get().await)
}

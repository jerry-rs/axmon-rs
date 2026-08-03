use axum::extract::State;
use axum::Json;

use crate::state::{AppState, FullSnapshot};

pub async fn get_all(State(state): State<AppState>) -> Json<FullSnapshot> {
    Json(state.snapshot().await)
}

use axum::extract::State;
use axum::Json;

use crate::collectors::docker::DockerMetric;
use crate::scheduler::Timestamped;
use crate::state::AppState;

pub async fn get_docker(State(state): State<AppState>) -> Json<Timestamped<DockerMetric>> {
    Json(state.docker.get().await)
}

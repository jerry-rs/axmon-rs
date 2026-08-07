use axum::extract::State;
use axum::Json;

use crate::collectors::netlink::NetLinkMetric;
use crate::scheduler::Timestamped;
use crate::state::AppState;

pub async fn get_netlink(State(state): State<AppState>) -> Json<Timestamped<NetLinkMetric>> {
    Json(state.netlink.get().await)
}

use axum::Router;
use axum::routing::get;
use crate::home::handlers::stream::home_stream_handler;
use crate::state::AppState;

pub(crate) fn build_home_routers() ->Router<AppState>{
    Router::new()
        .route("/api/v1/home/stream",get(home_stream_handler))
}
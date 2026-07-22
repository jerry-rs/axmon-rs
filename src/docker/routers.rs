use axum::Router;
use axum::routing::get;
use crate::docker::handlers::container::docker_containers_handler;
use crate::docker::handlers::image::docker_images_handler;
use crate::state::AppState;

pub(crate) fn build_docker_routers() ->Router<AppState>{
    Router::new()
        .route("/api/v1/docker/images", get(docker_images_handler))
        .route("/api/v1/docker/containers", get(docker_containers_handler))
}
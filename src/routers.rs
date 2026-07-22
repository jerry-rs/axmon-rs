use axum::http::{StatusCode, Uri};
use axum::response::IntoResponse;
use axum::Router;
use axum::routing::get;
use rust_embed::Embed;
use crate::cpu::routers::build_cpu_routers;
use crate::disk::routers::build_disk_routers;
use crate::docker::routers::build_docker_routers;
use crate::gpu::routers::build_gpu_routers;
use crate::home::routers::build_home_routers;
use crate::mem::routers::build_mem_routers;
use crate::process::routers::build_process_routers;
use crate::state::AppState;


#[derive(Embed)]
#[folder = "dist/"]
struct Assets;

async fn index_handler(uri: Uri) -> impl IntoResponse {
    let path = match uri.path().trim_start_matches('/') {
        "" => "index.html",
        p => p,
    };
    match Assets::get(path) {
        Some(content) => {
            let mime_type = content.metadata.mimetype().to_string();
            axum::response::Response::builder()
                .status(StatusCode::OK)
                .header(axum::http::header::CONTENT_TYPE, mime_type)
                .body(axum::body::Body::from(content.data))
                .unwrap()
        }
        None => {
            if let Some(index) = Assets::get("index.html") {
                axum::response::Response::builder()
                    .header(axum::http::header::CONTENT_TYPE, "text/html")
                    .body(axum::body::Body::from(index.data))
                    .unwrap()
            } else {
                axum::response::Response::builder()
                    .status(StatusCode::NOT_FOUND)
                    .body(axum::body::Body::from("404 Not Found"))
                    .unwrap()
            }
        }
    }
}


pub(crate) fn build_global_routers(state:AppState) ->Router{
    Router::new()
        .route("/", get(index_handler))
        .route("/{*path}",get(index_handler))
        .route("/api/health", get(|| async { "true" }))
        .merge(build_cpu_routers())
        .merge(build_mem_routers())
        .merge(build_disk_routers())
        .merge(build_docker_routers())
        .merge(build_gpu_routers())
        .merge(build_home_routers())
        .merge(build_process_routers())
        .fallback(||async {  "Not Found API"})
        .with_state(state)
}
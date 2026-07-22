use crate::state::AppState;
use axum::Json;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use serde::Serialize;
use tracing::error;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Image {
    id: String,
    repo_tags: Vec<String>,
    created: i64,
    size: i64,
    shared_size: i64,
}

#[derive(Serialize)]
pub(crate) struct DockerImagesResponse {
    timestamp: u64,
    images: Vec<Image>,
}

pub(crate) async fn docker_images_handler(
    axum::extract::State(state): axum::extract::State<AppState>,
) -> impl IntoResponse {
    match state.docker_client {
        Some(ref client) => {
            let options = bollard::query_parameters::ListImagesOptionsBuilder::default()
                .all(true)
                .shared_size(true)
                .build();
            match client.list_images(Some(options)).await {
                Ok(images_summary) => {
                    let images = images_summary
                        .into_iter()
                        .map(|i| {
                            let id = i.id;
                            let repo_tags = i.repo_tags;
                            let created = i.created;
                            let size = i.size;
                            let shared_size = i.shared_size;
                            Image {
                                id,
                                repo_tags,
                                created,
                                size,
                                shared_size,
                            }
                        })
                        .collect::<Vec<_>>();
                    let docker_image_response = DockerImagesResponse {
                        timestamp: std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .map(|t| t.as_secs())
                            .unwrap_or_else(|_| 0),
                        images,
                    };
                    (StatusCode::OK, Json(docker_image_response)).into_response()
                }
                Err(e) => {
                    error!("{e}");
                    (StatusCode::INTERNAL_SERVER_ERROR, "list images failed").into_response()
                }
            }
        }
        None => (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Docker is no longer in progress",
        )
            .into_response(),
    }
}

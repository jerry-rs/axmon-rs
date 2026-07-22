use crate::state::AppState;
use axum::Json;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use serde::{Serialize};

#[derive( Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Port {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ip: Option<String>,
    /// Port on the container
    pub private_port: u16,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub public_port: Option<u16>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub r#type: Option<String>,

}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Container {
    pub(crate) id: Option<String>,
    pub(crate) names: Option<Vec<String>>,
    pub(crate) image: Option<String>,
    pub(crate) command: Option<String>,
    pub(crate) created: Option<i64>,
    pub(crate) size_rw: Option<i64>,
    pub(crate) size_root_fs: Option<i64>,
    pub(crate) state: String,
    pub(crate) status: Option<String>,
    pub(crate) ports: Option<Vec<Port>>,
}

#[derive(Serialize)]
pub(crate) struct DockerContainersResponse {
    pub(crate) timestamp: u64,
    pub(crate) containers: Vec<Container>,
}

pub(crate) async fn docker_containers_handler(
    axum::extract::State(state): axum::extract::State<AppState>,
) -> impl IntoResponse {
    match state.docker_client {
        Some(ref client) => {
            let options = bollard::query_parameters::ListContainersOptionsBuilder::default()
                .all(true)
                .size(true)
                .build();
            match client.list_containers(Some(options)).await {
                Ok(container_summary) => {
                    let containers = container_summary
                        .into_iter()
                        .map(|c| {
                            let id = c.id;
                            let names = c.names;
                            let image = c.image;
                            let command = c.command;
                            let created = c.created;
                            let size_rw = c.size_rw;
                            let size_root_fs = c.size_root_fs;
                            let state = c.state.map(|s|s.to_string()).unwrap_or("Unknown".to_string()).to_string();
                            let status = c.status;
                            let ports = c.ports
                                .map(|mut port_summary|{
                                    port_summary.sort_by(|a,b|a.public_port.cmp(&b.public_port));
                                    port_summary
                                        .into_iter()
                                        .map(|ps|{
                                            Port{
                                                ip: ps.ip,
                                                private_port: ps.private_port,
                                                public_port: ps.public_port,
                                                r#type: ps.typ.map(|t|t.to_string()),
                                            }
                                        }).collect::<Vec<_>>()

                                });
                            Container {
                                id,
                                names,
                                image,
                                command,
                                created,
                                size_rw,
                                size_root_fs,
                                state,
                                status,
                                ports
                            }
                        })
                        .collect::<Vec<Container>>();
                    let docker_container_response = DockerContainersResponse {
                        timestamp: std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .map(|t| t.as_secs())
                            .unwrap_or_else(|_| 0),
                        containers,
                    };

                    (StatusCode::OK, Json(docker_container_response)).into_response()
                }
                Err(e) => {
                    eprintln!("{}", e);
                    (StatusCode::INTERNAL_SERVER_ERROR, "list containers failed").into_response()
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

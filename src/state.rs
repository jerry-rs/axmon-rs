
#[derive(Clone)]
pub(crate) struct AppState{
    pub(crate) docker_client:Option<bollard::Docker>
}
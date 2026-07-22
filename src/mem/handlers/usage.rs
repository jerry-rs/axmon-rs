use axum::http::StatusCode;
use axum::Json;
use axum::response::IntoResponse;

pub(crate) async fn mem_usage_handler() ->impl IntoResponse{
    let mem = sysinfo::System::new_with_specifics(
        sysinfo::RefreshKind::nothing().with_memory(
            sysinfo::MemoryRefreshKind::everything()
        )
    );
    let mem_usage = mem.used_memory() as f32 / mem.total_memory() as f32 * 100f32;
    (StatusCode::OK, Json(mem_usage)).into_response()
}
use axum::http::StatusCode;
use axum::Json;
use axum::response::IntoResponse;

pub(crate) async fn cpu_usage_handler() ->impl IntoResponse{
    let cpu_usage = sysinfo::System::new_with_specifics(
        sysinfo::RefreshKind::nothing().with_cpu(
            sysinfo::CpuRefreshKind::nothing().with_cpu_usage()
        )
    );
    let global_cpu_usage = cpu_usage.global_cpu_usage();
    (StatusCode::OK, Json(global_cpu_usage)).into_response()
}
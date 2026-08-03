use axum::Json;

/// 存活探针：不查任何采集缓存，进程能响应就算 healthy。
pub async fn health() -> Json<serde_json::Value> {
    Json(serde_json::json!({ "status": "healthy" }))
}

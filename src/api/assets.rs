use std::path::Path;

use axum::http::header::{CACHE_CONTROL, CONTENT_TYPE};
use axum::http::{Method, StatusCode, Uri};
use axum::response::{IntoResponse, Response};
use rust_embed::RustEmbed;

/// 编译期嵌入的前端产物：release 嵌进二进制；debug 改为运行时从磁盘读，
/// 前端重建后重启进程即生效，不必重编译 Rust。构建顺序由 build.rs 保证
/// （编译本 crate 前 dist 已生成）。
#[derive(RustEmbed)]
#[folder = "web/dist"]
struct Assets;

/// 静态资源 + SPA 托管，挂在 Router::fallback 上，/api、/ws、/sse 优先匹配。
pub async fn serve_embedded(method: Method, uri: Uri) -> Response {
    if !matches!(method, Method::GET | Method::HEAD) {
        return StatusCode::METHOD_NOT_ALLOWED.into_response();
    }

    let path = uri.path().trim_start_matches('/');
    let file = Assets::get(path).or_else(|| {
        // SPA 回退：只接管"看起来像前端路由"的路径（无扩展名），
        // 带扩展名的静态资源缺失时仍返回 404，避免用 HTML 冒充 JS/CSS。
        if Path::new(path).extension().is_none() {
            Assets::get("index.html")
        } else {
            None
        }
    });

    match file {
        Some(file) => {
            // vite 产物 assets/ 下的文件名带内容哈希，可永久缓存；
            // index.html / favicon 等固定文件名必须每次回源校验。
            let cache = if path.starts_with("assets/") {
                "public, max-age=31536000, immutable"
            } else {
                "no-cache"
            };
            (
                [
                    (CONTENT_TYPE, file.metadata.mimetype()),
                    (CACHE_CONTROL, cache),
                ],
                file.data,
            )
                .into_response()
        }
        None => StatusCode::NOT_FOUND.into_response(),
    }
}

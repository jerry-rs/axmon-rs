use std::sync::atomic::Ordering;
use std::time::Duration;

use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::extract::State;
use axum::response::IntoResponse;

use crate::state::AppState;

pub async fn ws_handler(ws: WebSocketUpgrade, State(state): State<AppState>) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

/// 连接建立时 +1，断开（无论是正常关闭还是异常断开）时 -1。
/// 用 Drop 实现保证任何退出路径都会正确减掉计数。
struct ConnGuard(std::sync::Arc<std::sync::atomic::AtomicUsize>);

impl Drop for ConnGuard {
    fn drop(&mut self) {
        self.0.fetch_sub(1, Ordering::Relaxed);
    }
}

async fn handle_socket(mut socket: WebSocket, state: AppState) {
    state.ws_connections.fetch_add(1, Ordering::Relaxed);
    let _guard = ConnGuard(state.ws_connections.clone());

    // 推送节奏跟采集节奏解耦：采集在后台按各自的 poll_interval 独立运行，
    // 这里只是定期把"当前缓存"序列化推给客户端，推快了也不会触发额外采集。
    let mut interval = tokio::time::interval(Duration::from_secs(1));

    loop {
        tokio::select! {
            _ = interval.tick() => {
                let snapshot = state.snapshot().await;
                let payload = match serde_json::to_string(&snapshot) {
                    Ok(p) => p,
                    Err(_) => continue,
                };
                if socket.send(Message::Text(payload.into())).await.is_err() {
                    break;
                }
            }
            msg = socket.recv() => {
                match msg {
                    Some(Ok(Message::Close(_))) | None => break,
                    Some(Err(_)) => break,
                    _ => {} // 忽略客户端发来的其他消息（心跳 ping 之类交给 axum 底层处理）
                }
            }
        }
    }
}

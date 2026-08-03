use std::convert::Infallible;
use std::time::Duration;

use axum::extract::State;
use axum::response::sse::{Event, KeepAlive, Sse};
use futures_util::stream::{self, Stream};

use crate::state::AppState;

/// SSE 实时流：推送内容、节奏、缓存来源都跟 WebSocket 端一致，
/// 区别只在传输层——SSE 是 server → client 单向通道，跑在普通
/// HTTP 上不需要协议升级，浏览器 EventSource 可直接消费且断线
/// 自动重连。只推不收的场景用它比 WS 简单；需要客户端上行消息
/// 时才需要 ws.rs。
pub async fn sse_handler(
    State(state): State<AppState>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    // unfold 的状态是 (AppState, Interval)：interval 首次 tick 立即返回，
    // 所以连接建立后立刻推第一帧，之后每秒一帧，与 ws.rs 的节奏一致。
    // 客户端断开时 axum 停止 poll 这个 stream，无需显式清理。
    let stream = stream::unfold(
        (state, tokio::time::interval(Duration::from_secs(1))),
        |(state, mut interval)| async move {
            interval.tick().await;

            let event = match serde_json::to_string(&state.snapshot().await) {
                // 命名事件 "metrics"，前端可以
                // source.addEventListener("metrics", ...) 精确订阅。
                Ok(payload) => Event::default().event("metrics").data(payload),
                // 全量快照理论上不会序列化失败；真失败时发一条注释帧
                // 保持连接存活，不让前端误以为断流。
                Err(_) => Event::default().comment("snapshot serialization failed"),
            };

            Some((Ok(event), (state, interval)))
        },
    );

    // 正常每秒一帧时 keep-alive 不会触发；它只是兜底——如果推送节奏
    // 因任何原因停滞，注释帧能防止中间代理按空闲超时断开连接。
    Sse::new(stream).keep_alive(KeepAlive::default())
}

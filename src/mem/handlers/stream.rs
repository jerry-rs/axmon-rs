use axum::response::Sse;
use axum::response::sse::Event;
use serde::Serialize;
use std::convert::Infallible;
use tokio_stream::Stream;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct MemStreamResponse {
    timestamp: u64,
    available_memory: u64,
    free_memory: u64,
    used_memory: u64,
    total_memory: u64,
    mem_usage: f32,
}

pub(crate) async fn mem_stream_handler() -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let stream = async_stream::stream! {
        let mut sys = sysinfo::System::new_with_specifics(
            sysinfo::RefreshKind::nothing()
                .with_memory(sysinfo::MemoryRefreshKind::everything()),
        );
        sys.refresh_memory();
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(1));
        interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
        loop{
            let _ = interval.tick().await;
            sys.refresh_memory();

            let available_memory = sys.available_memory();
            let free_memory = sys.free_memory();
            let used_memory = sys.used_memory();
            let total_memory = sys.total_memory();

            let mem_stream_response =  MemStreamResponse{
                timestamp: std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .ok()
                            .map(|x| x.as_secs())
                            .unwrap_or_else(||0),
                available_memory,
                free_memory,
                used_memory,
                total_memory,
                mem_usage:used_memory as f32 / total_memory as f32 * 100f32,
            };
            if let Ok(event) = Event::default().json_data(&mem_stream_response) {
                yield Ok(event);
            }
        }
    };

    Sse::new(stream).keep_alive(
        axum::response::sse::KeepAlive::new().interval(tokio::time::Duration::from_secs(15)),
    )
}

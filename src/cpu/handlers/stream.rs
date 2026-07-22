use axum::response::Sse;
use axum::response::sse::Event;
use serde::Serialize;
use std::convert::Infallible;
use tokio_stream::Stream;

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CpuCore {
    name: String,
    usage: f32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CpuStreamResponse {
    timestamp: u64,
    cpu_usage: f32,
    #[serde(flatten)]
    load_average: sysinfo::LoadAvg,
    cpus: Vec<CpuCore>,
}

pub(crate) async fn cpu_stream_handler() -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let mut sys = sysinfo::System::new_with_specifics(
        sysinfo::RefreshKind::nothing()
            .with_cpu(sysinfo::CpuRefreshKind::nothing().with_cpu_usage()),
    );
    sys.refresh_cpu_all();

    // 静态信息采集
    let static_metas: Vec<CpuCore> = sys
        .cpus()
        .iter()
        .map(|c| CpuCore {
            name: c.name().to_string(),
            usage: 0.0,
        })
        .collect();

    let stream = async_stream::stream! {
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(1));
        interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
        loop {
            let _ = interval.tick().await;
            sys.refresh_cpu_all();
            let cpu_usage = sys.global_cpu_usage();
            let load_average = sysinfo::System::load_average();


            let cpus: Vec<CpuCore> = sys
                .cpus()
                .iter()
                .zip(static_metas.iter())
                .map(|(c, meta)| CpuCore {
                    name: meta.name.clone(),
                    usage: c.cpu_usage(),
                })
                .collect();

            let timestamp = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .ok()
                .map(|x| x.as_secs())
                .unwrap_or(0);

            let cpu_stream_response = CpuStreamResponse {
                timestamp,
                cpu_usage,
                load_average,
                cpus,
            };
            if let Ok(event) = Event::default().json_data(&cpu_stream_response) {
                yield Ok(event);
            }
        }
    };

    Sse::new(stream).keep_alive(
        axum::response::sse::KeepAlive::new().interval(tokio::time::Duration::from_secs(15)),
    )
}

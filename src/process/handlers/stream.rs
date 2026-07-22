use axum::response::sse::Event;
use axum::response::{Sse};
use serde::Serialize;
use std::convert::Infallible;
use tokio_stream::Stream;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Process {
    pid: u32,
    ppid: Option<u32>,
    user: String,
    cpu_usage: f32,
    memory: u64,
    virtual_memory: u64,
    status: String,
    cmd: String,
    command: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ProcessStreamResponse {
    timestamp: u64,
    processes: Vec<Process>,
}

pub(crate) async fn process_stream_handler() -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let stream = async_stream::stream! {
        let mut sys = sysinfo::System::new_with_specifics(
            sysinfo::RefreshKind::nothing().with_processes(sysinfo::ProcessRefreshKind::everything()),
        );
        // 1. 将 Users 提升到循环体外初始化
        let mut users = sysinfo::Users::new_with_refreshed_list();
        sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);

        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(1));
        interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);


        let mut tick_count: u8 = 0;
        loop{
            let _ = interval.tick().await;

            sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
            if tick_count.is_multiple_of(60) {
                users.refresh();
            }
            tick_count = tick_count.wrapping_add(1);
            let processes = sys
                .processes()
                .values()
                .map(|p| {
                    let pid = p.pid().as_u32();
                    let ppid = p.parent().map(|p| p.as_u32());
                    let user = p
                        .user_id()
                        .or_else(|| p.effective_user_id())
                        .map_or_else(
                            || "?".to_string(),
                            |u| {
                                users
                                    .get_user_by_id(u)
                                    .map_or_else(|| u.to_string(), |u| u.name().to_string())
                            },
                    );
                    let cpu_usage = p.cpu_usage();
                    let memory = p.memory();
                    let virtual_memory = p.virtual_memory();
                    let status = p.status().to_string();

                    let cmd_parts: Vec<_> = p.cmd().iter().map(|s| s.to_string_lossy()).collect();
                    let cmd = cmd_parts.join(" ");

                    let command = if cmd.is_empty() {
                        p.name().to_string_lossy().into_owned()
                    } else {
                        cmd.clone()
                    };
                    Process {
                        pid,
                        ppid,
                        user,
                        cpu_usage,
                        memory,
                        virtual_memory,
                        status,
                        cmd,
                        command,
                    }
                })
                .collect::<Vec<Process>>();

           let process_stream_response =  ProcessStreamResponse{
                timestamp:std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .ok()
                            .map(|x| x.as_secs())
                            .unwrap_or_else(||0),
                processes
            };
            if let Ok(event) = Event::default().json_data(&process_stream_response) {
                yield Ok(event);
            }
        }
    };

    Sse::new(stream).keep_alive(
        axum::response::sse::KeepAlive::new().interval(tokio::time::Duration::from_secs(15)),
    )
}

use async_trait::async_trait;
use serde::Serialize;

use super::Collector;

#[derive(Serialize, Clone, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct NetLinkMetric {
    pub connections: Vec<ConnEntry>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ConnEntry {
    pub protocol: &'static str,
    pub local_ip: String,
    pub local_port: u16,
    pub remote_ip: Option<String>,
    pub remote_port: Option<u16>,
}

pub struct NetLinkCollector {}

impl NetLinkCollector {
    pub fn new() -> Self {
        Self {}
    }
}

impl Default for NetLinkCollector {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl Collector for NetLinkCollector {
    type Metric = NetLinkMetric;

    #[cfg(target_os = "linux")]
    async fn collect(&self) -> anyhow::Result<NetLinkMetric> {
        // netlink-sys 的 Socket 是阻塞 I/O。dump 通常毫秒级返回，
        // 但连接数上万时耗时可见，放 spawn_blocking 里跑，
        // 避免占住 tokio 工作线程拖累 API 响应。
        let mut connections = tokio::task::spawn_blocking(linux::dump_all).await??;
        connections.sort_by(|a, b| {
            a.local_ip
                .cmp(&b.local_ip)
                .then_with(|| a.local_port.cmp(&b.local_port))
        });
        Ok(NetLinkMetric { connections })
    }

    #[cfg(not(target_os = "linux"))]
    async fn collect(&self) -> anyhow::Result<NetLinkMetric> {
        // INET_DIAG 是 Linux 专有接口，macOS/Windows 没有等价物。
        // 返回 Err 时调度器保留旧缓存并打 warn，不影响其他采集器。
        anyhow::bail!("netlink 采集仅支持 Linux")
    }

    fn name(&self) -> &'static str {
        "netlink"
    }
}

/// INET_DIAG 是 `ss` 命令同款内核接口：一次 dump 拿到全部 socket
/// 的连接信息，二进制协议，比逐个解析 /proc/net/* 文本快得多。
#[cfg(target_os = "linux")]
mod linux {
    use anyhow::{Context, Result};
    use netlink_packet_core::{
        NetlinkHeader, NetlinkMessage, NetlinkPayload, NLM_F_DUMP, NLM_F_REQUEST,
    };
    use netlink_packet_sock_diag::{
        constants::{AF_INET, AF_INET6, IPPROTO_TCP, IPPROTO_UDP},
        inet::{ExtensionFlags, InetRequest, SocketId, StateFlags},
        SockDiagMessage,
    };
    use netlink_sys::{protocols::NETLINK_SOCK_DIAG, Socket, SocketAddr};

    use super::ConnEntry;

    pub fn dump_all() -> Result<Vec<ConnEntry>> {
        let mut out = Vec::new();
        // TCP：排除 LISTEN（等 ss 默认行为）和 TIME_WAIT（量大、转瞬即逝）。
        let tcp_states = StateFlags::all() & !(StateFlags::LISTEN | StateFlags::TIME_WAIT);
        // UDP 没有 LISTEN 状态：bind 后等数据的"监听"socket 状态是 CLOSE，
        // connect 过的才是 ESTABLISHED。只取 ESTABLISHED 即过滤 UDP 监听。
        let udp_states = StateFlags::ESTABLISHED;
        dump_inet(AF_INET, IPPROTO_TCP, "tcp", tcp_states, &mut out)?;
        dump_inet(AF_INET6, IPPROTO_TCP, "tcp", tcp_states, &mut out)?;
        dump_inet(AF_INET, IPPROTO_UDP, "udp", udp_states, &mut out)?;
        dump_inet(AF_INET6, IPPROTO_UDP, "udp", udp_states, &mut out)?;
        Ok(out)
    }

    fn dump_inet(
        family: u8,
        protocol: u8,
        protocol_name: &'static str,
        states: StateFlags,
        out: &mut Vec<ConnEntry>,
    ) -> Result<()> {
        // 每次 dump 用新 socket：dump 状态挂在单个 socket 上，
        // 中途出错不会污染后续请求；周期采集下 fd 开销可忽略。
        let mut socket = Socket::new(NETLINK_SOCK_DIAG).context("打开 NETLINK_SOCK_DIAG 失败")?;
        socket.bind_auto().context("netlink bind 失败")?;
        socket
            .connect(&SocketAddr::new(0, 0))
            .context("netlink connect 失败")?;

        let mut header = NetlinkHeader::default();
        header.flags = NLM_F_REQUEST | NLM_F_DUMP;
        let mut request = NetlinkMessage::new(
            header,
            SockDiagMessage::InetRequest(InetRequest {
                family,
                protocol,
                extensions: ExtensionFlags::empty(),
                states,
                socket_id: if family == AF_INET {
                    SocketId::new_v4()
                } else {
                    SocketId::new_v6()
                },
            })
            .into(),
        );
        request.finalize();
        let mut buf = vec![0u8; request.buffer_len()];
        request.serialize(&mut buf);
        socket
            .send(&buf, 0)
            .context("发送 sock_diag dump 请求失败")?;

        let mut receive_buffer = vec![0u8; 64 * 1024];
        while let Ok(size) = socket.recv(&mut &mut receive_buffer[..], 0) {
            if size == 0 {
                break;
            }
            // 一个数据报可能装多条 netlink 消息，靠 header.length 逐条切。
            let mut offset = 0usize;
            loop {
                let bytes = &receive_buffer[offset..size];
                let message = match <NetlinkMessage<SockDiagMessage>>::deserialize(bytes) {
                    Ok(m) => m,
                    // 尾部残缺理论上不该发生；已收到的部分保留，结束本轮。
                    Err(_) => break,
                };
                match message.payload {
                    NetlinkPayload::InnerMessage(SockDiagMessage::InetResponse(resp)) => {
                        let id = &resp.header.socket_id;
                        out.push(ConnEntry {
                            protocol: protocol_name,
                            local_ip: id.source_address.to_string(),
                            remote_ip: (id.destination_port != 0)
                                .then(|| id.destination_address.to_string()),
                            local_port: id.source_port,
                            remote_port: (id.destination_port != 0).then_some(id.destination_port),
                        });
                    }
                    NetlinkPayload::Done(_) => return Ok(()),
                    NetlinkPayload::Error(e) => {
                        return Err(anyhow::anyhow!("内核返回 netlink 错误: {e:?}"));
                    }
                    _ => {}
                }
                if message.header.length == 0 {
                    break;
                }
                offset += message.header.length as usize;
                if offset >= size {
                    break;
                }
            }
        }
        Ok(())
    }
}

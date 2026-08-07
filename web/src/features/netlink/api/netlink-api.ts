import { api } from "@/lib/api-client";

// 对应后端 collectors/netlink.rs 的 ConnEntry / NetLinkMetric。
// 外层 Timestamped 信封经 serde flatten 平铺（见 scheduler.rs），camelCase。
export interface ConnEntry {
  protocol: "tcp" | "udp";
  localIp: string;
  /** TCP Listen、未 connect 的 UDP 没有对端，后端给 null。 */
  remoteIp: string | null;
  localPort: number;
  remotePort: number | null;
}

export interface NetLinkMetric {
  /** 这份数据什么时候采到的；0 是哨兵：后端还没采到首轮。 */
  collectedAtUnixMs: number;
  connections: ConnEntry[];
}

export function fetchNetLinkMetric(): Promise<NetLinkMetric> {
  return api.get<NetLinkMetric>("/metrics/netlink");
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { NetLinkMetric } from "../api/netlink-api";

export function NetLinkStatCards({ metric }: { metric: NetLinkMetric }) {
  const conns = metric.connections;
  const tcpCount = conns.filter((c) => c.protocol === "tcp").length;
  const udpCount = conns.length - tcpCount;
  // 后端不带 state 字段：有对端地址（remoteIp 非 null）即视为活跃连接，
  // 反之为 Listen 或未 connect 的 UDP。
  const activeCount = conns.filter((c) => c.remoteIp !== null).length;

  const items = [
    { label: "Total", value: String(conns.length) },
    { label: "TCP", value: String(tcpCount) },
    { label: "UDP", value: String(udpCount) },
    { label: "Active", value: String(activeCount) },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader>
            <CardTitle className="text-xs font-normal text-muted-foreground">
              {item.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums text-green-500">
              {item.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

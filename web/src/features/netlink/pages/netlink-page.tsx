import { useMemo, useState } from "react";

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Freshness } from "@/components/freshness";

import { useNetLinkMetric } from "../hooks/use-netlink-metric";
import { NetLinkStatCards } from "../components/netlink-stat-cards";
import { connectionColumns } from "../components/connection-columns";

type ProtoFilter = "all" | "tcp" | "udp";

export function NetLinkPage() {
  const { data, isPending, isError, error } = useNetLinkMetric();
  const [proto, setProto] = useState<ProtoFilter>("all");

  // 内核 dump 的顺序是随机的，2s 一轮的轮询下列表会来回跳动，
  // 所以渲染前排一个稳定顺序。排序键必须落到 socket 四元组才够：
  // 只到 remotePort 为止的话，不同来源 IP 恰好同临时端口的入站连接
  // 会并列，并列行的相对顺序仍取决于 dump 顺序，照样会跳。
  // 无对端的行（Listen / 未 connect 的 UDP）当作组首，排在同端口
  // 的活跃连接前面。
  const connections = useMemo(() => {
    const filtered = (data?.connections ?? []).filter(
      (c) => proto === "all" || c.protocol === proto,
    );
    return [...filtered].sort(
      (a, b) =>
        a.protocol.localeCompare(b.protocol) ||
        a.localPort - b.localPort ||
        a.localIp.localeCompare(b.localIp) ||
        (a.remotePort ?? -1) - (b.remotePort ?? -1) ||
        (a.remoteIp ?? "").localeCompare(b.remoteIp ?? ""),
    );
  }, [data, proto]);

  if (isPending) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner />
        Loading…
      </p>
    );
  }
  if (isError) {
    return <p className="text-sm text-red-500">{error.message}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Network Connections
        </h1>
        <Freshness collectedAtUnixMs={data.collectedAtUnixMs} staleAfterMs={6_000} />
      </div>

      <NetLinkStatCards metric={data} />

      <Card>
        <CardHeader>
          <CardTitle>Connections</CardTitle>
          <CardAction>
            <Tabs value={proto} onValueChange={(v) => setProto(v as ProtoFilter)}>
              <TabsList>
                <TabsTrigger value="all">ALL</TabsTrigger>
                <TabsTrigger value="tcp">TCP</TabsTrigger>
                <TabsTrigger value="udp">UDP</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardAction>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={connectionColumns}
            data={connections}
            emptyMessage="No connections."
          />
        </CardContent>
      </Card>
    </div>
  );
}

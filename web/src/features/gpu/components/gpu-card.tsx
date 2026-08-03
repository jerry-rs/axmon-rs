import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { UsageBar } from "@/components/usage-bar";
import { UsageTrendChart, type UsageTrendPoint } from "@/components/usage-trend-chart";
import { formatBytes } from "@/lib/format";

import type { GpuInfo } from "../api/gpu-api";
import { gpuProcessColumns } from "./gpu-process-columns";

interface GpuCardProps {
  gpu: GpuInfo;
  history: UsageTrendPoint[];
}

export function GpuCard({ gpu, history }: GpuCardProps) {
  // unhealthy 的卡除 index / healthy / error 外都是默认值（见 gpu.rs），
  // 单独渲染一张错误卡，不拿默认值画假图表。
  if (!gpu.healthy) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>GPU {gpu.index}</CardTitle>
          <CardDescription>Query failed — showing no metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">
            {gpu.error ?? "unknown error"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>GPU {gpu.index}</CardTitle>
        <CardDescription>
          {gpu.name} · {gpu.temperatureC}°C
        </CardDescription>
        <CardAction className="text-3xl font-semibold tabular-nums">
          {gpu.utilizationPercent}%
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-6">
        {history.length >= 2 ? (
          <UsageTrendChart history={history} color="#f59e0b" label="GPU utilization" />
        ) : (
          <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
            Collecting samples…
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">GRAM</span>
            <span className="tabular-nums">
              {formatBytes(gpu.memUsedBytes)} / {formatBytes(gpu.memTotalBytes)}
              <span className="text-muted-foreground">
                {" "}
                ({gpu.memUsagePercent.toFixed(1)}%)
              </span>
            </span>
          </div>
          <UsageBar percent={gpu.memUsagePercent} />
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Processes
            {gpu.processes.length > 0 &&
              ` · ${gpu.processes.length} compute, by GRAM descending`}
          </p>
          <DataTable
            columns={gpuProcessColumns}
            data={gpu.processes}
            emptyMessage="No compute processes"
          />
        </div>
      </CardContent>
    </Card>
  );
}

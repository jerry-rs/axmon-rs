import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { formatBytes } from "@/lib/format";

import type { GpuMetric } from "../api/gpu-api";

interface GpuStatCardsProps {
  metric: GpuMetric;
}

// 多卡时"最差的一张卡"比平均值更有告警价值：单卡打满/过热会被平均数稀释。
// 三张卡都标出是哪张卡（GPU index），方便直接跳到下面对应的详情卡。
export function GpuStatCards({ metric }: GpuStatCardsProps) {
  const healthy = metric.gpus.filter((g) => g.healthy);

  const busiest = healthy.reduce<GpuMetric["gpus"][number] | null>(
    (max, g) => (max === null || g.utilizationPercent > max.utilizationPercent ? g : max),
    null,
  );
  const fullest = healthy.reduce<GpuMetric["gpus"][number] | null>(
    (max, g) => (max === null || g.memUsagePercent > max.memUsagePercent ? g : max),
    null,
  );
  const hottest = healthy.reduce<GpuMetric["gpus"][number] | null>(
    (max, g) => (max === null || g.temperatureC > max.temperatureC ? g : max),
    null,
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader>
          <CardDescription>GPUs</CardDescription>
          <CardTitle className="text-2xl tabular-nums">
            {healthy.length}
            <span className="text-sm font-normal text-muted-foreground">
              {" "}
              / {metric.gpus.length} healthy
            </span>
          </CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Max GPU utilization</CardDescription>
          <CardTitle className="text-2xl tabular-nums">
            {busiest ? `${busiest.utilizationPercent}%` : "—"}
            {busiest && (
              <span className="text-sm font-normal text-muted-foreground">
                {" "}
                GPU {busiest.index}
              </span>
            )}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Max VRAM</CardDescription>
          <CardTitle className="text-2xl tabular-nums">
            {fullest ? formatBytes(fullest.memUsedBytes) : "—"}
            {fullest && (
              <span className="text-sm font-normal text-muted-foreground">
                {" "}
                / {formatBytes(fullest.memTotalBytes)} · GPU {fullest.index}
              </span>
            )}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Max temperature</CardDescription>
          <CardTitle className="text-2xl tabular-nums">
            {hottest ? `${hottest.temperatureC}°C` : "—"}
            {hottest && (
              <span className="text-sm font-normal text-muted-foreground">
                {" "}
                GPU {hottest.index}
              </span>
            )}
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UsageTrendChart } from "@/components/usage-trend-chart";
import { formatBytes } from "@/lib/format";

import type { MemUsageSample } from "../hooks/use-mem-history";

interface SwapCardProps {
  swapTotalBytes: number;
  swapUsedBytes: number;
  swapUsagePercent: number;
  history: MemUsageSample[];
}

export function SwapCard({
  swapTotalBytes,
  swapUsedBytes,
  swapUsagePercent,
  history,
}: SwapCardProps) {
  if (swapTotalBytes === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Swap</CardTitle>
          <CardDescription>No swap configured on this machine</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const points = history.map((s) => ({ time: s.time, usage: s.swapUsage }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Swap Usage</CardTitle>
        <CardDescription>
          Used {formatBytes(swapUsedBytes)} / {formatBytes(swapTotalBytes)} · last 60s
        </CardDescription>
        <CardAction className="text-3xl font-semibold tabular-nums">
          {swapUsagePercent.toFixed(1)}%
        </CardAction>
      </CardHeader>
      <CardContent>
        {points.length >= 2 ? (
          <UsageTrendChart history={points} color="#8b5cf6" />
        ) : (
          <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
            Collecting samples…
          </div>
        )}
      </CardContent>
    </Card>
  );
}

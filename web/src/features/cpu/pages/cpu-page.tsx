import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Freshness } from "@/components/freshness";
import { UsageTrendChart } from "@/components/usage-trend-chart";

import { useCpuHistory } from "../hooks/use-cpu-history";
import { PerCoreGrid } from "../components/per-core-grid";
import { LoadAverageCards } from "../components/load-average-cards";

export function CpuPage() {
  const { data, history, isPending, isError, error } = useCpuHistory();

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
        <h1 className="text-2xl font-semibold tracking-tight">CPU</h1>
        <Freshness collectedAtUnixMs={data.collectedAtUnixMs} staleAfterMs={5_000} />
      </div>

      <LoadAverageCards
        loadAvg1={data.loadAvg1}
        loadAvg5={data.loadAvg5}
        loadAvg15={data.loadAvg15}
      />

      {/* hero 卡：当前值（右上角大数字）+ 最近 60 秒趋势讲同一件事，
          原来的独立 UsageBar 与曲线最新点 + Y 轴信息重复，去掉了。 */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Usage</CardTitle>
          <CardDescription>
            {data.perCoreUsagePercent.length} cores · last 60s
          </CardDescription>
          <CardAction className="text-3xl font-semibold tabular-nums">
            {data.globalUsagePercent.toFixed(1)}%
          </CardAction>
        </CardHeader>
        <CardContent>
          {history.length >= 2 ? (
            <UsageTrendChart history={history} color="#10b981" />
          ) : (
            <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
              Collecting samples…
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Per-Core Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <PerCoreGrid perCore={data.perCoreUsagePercent} />
        </CardContent>
      </Card>
    </div>
  );
}

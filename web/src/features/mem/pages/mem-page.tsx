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

import { formatBytes } from "@/lib/format";

import { useMemHistory } from "../hooks/use-mem-history";
import { MemStatCards } from "../components/mem-stat-cards";
import { SwapCard } from "../components/swap-card";

export function MemPage() {
  const { data, history, isPending, isError, error } = useMemHistory();

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
        <h1 className="text-2xl font-semibold tracking-tight">Memory</h1>
        <Freshness collectedAtUnixMs={data.collectedAtUnixMs} staleAfterMs={5_000} />
      </div>

      <MemStatCards totalBytes={data.totalBytes} usedBytes={data.usedBytes} />

      <Card>
        <CardHeader>
          <CardTitle>Memory Usage</CardTitle>
          <CardDescription>
            Used {formatBytes(data.usedBytes)} / {formatBytes(data.totalBytes)} · Allocatable{" "}
            {formatBytes(data.availableBytes)} (incl. reclaimable cache) · last 60s
          </CardDescription>
          <CardAction className="text-3xl font-semibold tabular-nums">
            {data.usagePercent.toFixed(1)}%
          </CardAction>
        </CardHeader>
        <CardContent>
          {history.length >= 2 ? (
            <UsageTrendChart history={history} color="#0ea5e9" />
          ) : (
            <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
              Collecting samples…
            </div>
          )}
        </CardContent>
      </Card>

      <SwapCard
        swapTotalBytes={data.swapTotalBytes}
        swapUsedBytes={data.swapUsedBytes}
        swapUsagePercent={data.swapUsagePercent}
        history={history}
      />
    </div>
  );
}

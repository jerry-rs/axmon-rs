import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export interface UsageTrendPoint {
  /** X-axis timestamp in milliseconds. */
  collectedAtUnixMs: number;
  /** Usage percentage, 0-100. */
  usage: number;
}

interface UsageTrendChartProps {
  history: UsageTrendPoint[];
  /** Line/area color; each metric gets its own color (cpu green, mem blue, swap purple). */
  color: string;
  label?: string;
}

/** Tick interval: 10s for ~1-minute windows, 15s for longer ones (GPU uses 2
 *  minutes), keeping 6-8 ticks on the axis. */
function tickStepMs(spanMs: number): number {
  return spanMs > 90_000 ? 15_000 : 10_000;
}

/** Generic "usage trend" area chart: 0-100% Y axis, no animation (a live chart
 *  refreshing every second would just twitch constantly), no data point dots. */
export function UsageTrendChart({ history, color, label = "Usage" }: UsageTrendChartProps) {
  const chartConfig = {
    usage: { label, color },
  } satisfies ChartConfig;

  // A category axis gets a new category every second, and recharts re-picks
  // which ticks to show via minTickGap on every update, so the whole row of
  // time labels jumps each second. Use a numeric time axis instead, with ticks
  // aligned to wall-clock multiples of `step` and memoized per slot: as the
  // window slides, tick values stay put and only shift left smoothly.
  const start = history[0]?.collectedAtUnixMs ?? 0;
  const end = history[history.length - 1]?.collectedAtUnixMs ?? 0;
  const step = tickStepMs(end - start);
  const startSlot = Math.ceil(start / step);
  const endSlot = Math.floor(end / step);
  const ticks = useMemo(() => {
    const out: number[] = [];
    for (let s = startSlot; s <= endSlot; s++) out.push(s * step);
    return out;
  }, [startSlot, endSlot, step]);

  return (
    <ChartContainer config={chartConfig} className="h-[240px] w-full">
      <AreaChart data={history} margin={{ left: 4, right: 12, top: 4 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="collectedAtUnixMs"
          type="number"
          domain={["dataMin", "dataMax"]}
          ticks={ticks}
          tickFormatter={(v: number) => new Date(v).toLocaleTimeString()}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis
          domain={[0, 100]}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `${v}%`}
          width={40}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              // The first labelFormatter arg is not the raw x value: with a
              // numeric axis ChartTooltipContent replaces it with the config
              // label ("Usage"), so read the timestamp from the payload's
              // original data point instead.
              labelFormatter={(_label, payload) => {
                const ts = payload?.[0]?.payload?.collectedAtUnixMs;
                return typeof ts === "number"
                  ? new Date(ts).toLocaleTimeString()
                  : null;
              }}
            />
          }
        />
        <Area
          dataKey="usage"
          type="monotone"
          stroke="var(--color-usage)"
          fill="var(--color-usage)"
          fillOpacity={0.15}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}

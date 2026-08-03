import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export interface UsageTrendPoint {
  /** X 轴标签（HH:MM:SS）。 */
  time: string;
  /** 0-100 的百分比。 */
  usage: number;
}

interface UsageTrendChartProps {
  history: UsageTrendPoint[];
  /** 曲线/面积颜色，各指标用不同颜色区分（cpu 绿、mem 蓝、swap 紫）。 */
  color: string;
  label?: string;
}

/** 通用的"使用率趋势"面积图：0-100% 纵轴、无动画（每秒刷新的活图表
 *  开动画只会不停抽动）、无数据点圆点。 */
export function UsageTrendChart({ history, color, label = "使用率" }: UsageTrendChartProps) {
  const chartConfig = {
    usage: { label, color },
  } satisfies ChartConfig;

  return (
    <ChartContainer config={chartConfig} className="h-[240px] w-full">
      <AreaChart data={history} margin={{ left: 4, right: 12, top: 4 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="time"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={40}
        />
        <YAxis
          domain={[0, 100]}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `${v}%`}
          width={40}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
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

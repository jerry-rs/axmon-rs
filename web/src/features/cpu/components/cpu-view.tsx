import { useMemo } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Cpu, Activity, Layers, Zap, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { useCpuStream } from '../hooks/use-cpu-stream'

const CHART_CONFIG = {
  usage: {
    label: 'CPU Usage',
    color: 'hsl(142 76% 36%)',
  },
} as const

function usageColor(usage: number): { text: string; bg: string } {
  if (usage >= 90) return { text: 'text-red-500', bg: 'bg-red-500' }
  if (usage >= 75) return { text: 'text-yellow-500', bg: 'bg-yellow-500' }
  return { text: 'text-green-500', bg: 'bg-green-500' }
}

export function CpuView() {
  const { events, latest, error, isLoading } = useCpuStream()

  const chartData = useMemo(
    () =>
      events.map((e) => ({
        time: new Date(e.timestamp * 1000).toLocaleTimeString(),
        usage: Math.round(e.cpuUsage * 10) / 10,
      })),
    [events],
  )

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground">
        <Spinner /> Loading CPU data...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-lg">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-chart-1/10 p-2">
            <Cpu className="h-6 w-6 text-chart-1" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">CPU Monitor</h1>
            <p className="text-sm text-muted-foreground">Real-time CPU performance</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {latest && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Current Usage</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold tabular-nums ${usageColor(latest.cpuUsage).text}`}>
                {latest.cpuUsage.toFixed(1)}
                <span className="text-lg font-normal text-muted-foreground">%</span>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${usageColor(latest.cpuUsage).bg}`}
                  style={{ width: `${latest.cpuUsage}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Load 1m</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums">{latest.one.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Load 5m</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums">{latest.five.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Load 15m</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums">{latest.fifteen.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Area Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Usage History</CardTitle>
          <div className="text-xs text-muted-foreground">
            {chartData.length > 0 && `${chartData.length} data points`}
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={CHART_CONFIG} className="aspect-[3/1] w-full">
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillUsage" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142 76% 36%)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(142 76% 36%)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="time"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval="preserveStartEnd"
                minTickGap={16}
                fontSize={12}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                domain={[0, 100]}
                allowDataOverflow={false}
                tickFormatter={(v: number) => `${v}%`}
                fontSize={12}
                stroke="hsl(var(--muted-foreground))"
                width={50}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    indicator="line"
                    className="min-w-48"
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.time ?? ''}
                  />
                }
              />
              <Area
                dataKey="usage"
                type="monotone"
                stroke="hsl(142 76% 36%)"
                fill="url(#fillUsage)"
                strokeWidth={2}
                isAnimationActive={false}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Core List */}
      {latest?.cpus && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">CPU Cores</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {latest.cpus.map((core) => (
                <div key={core.name} className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{core.name}</span>
                    <span className={`font-medium tabular-nums ${usageColor(core.usage).text}`}>{core.usage.toFixed(1)}%</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${usageColor(core.usage).bg}`}
                      style={{ width: `${core.usage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

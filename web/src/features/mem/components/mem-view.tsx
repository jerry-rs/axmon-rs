import { useMemo } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MemoryStick, HardDrive, Layers, Zap, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { formatBytes } from '@/lib/format'
import { useMemStream } from '../hooks/use-mem-stream'

const CHART_CONFIG = {
  usage: {
    label: 'Memory Usage',
    color: 'hsl(142 76% 36%)',
  },
} as const

function usageColor(usage: number): { text: string; bg: string } {
  if (usage >= 80) return { text: 'text-red-500', bg: 'bg-red-500' }
  if (usage >= 50) return { text: 'text-yellow-500', bg: 'bg-yellow-500' }
  return { text: 'text-green-500', bg: 'bg-green-500' }
}

export function MemView() {
  const { events, latest, error, isLoading } = useMemStream()

  const chartData = useMemo(
    () =>
      events.map((e) => ({
        time: new Date(e.timestamp * 1000).toLocaleTimeString(),
        usage: e.memUsage,
      })),
    [events],
  )

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground">
        <Spinner /> Loading memory data...
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
            <MemoryStick className="h-6 w-6 text-chart-1" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Mem Monitor</h1>
            <p className="text-sm text-muted-foreground">Real-time memory usage</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {latest && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Current Usage</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold tabular-nums ${usageColor(latest.memUsage).text}`}>
                {latest.memUsage.toFixed(1)}
                <span className="text-lg font-normal text-muted-foreground">%</span>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${usageColor(latest.memUsage).bg}`}
                  style={{ width: `${latest.memUsage}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">{formatBytes(latest.totalMemory)}</div>
              <div className="mt-1 text-xs text-muted-foreground">Installed</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Free</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">{formatBytes(latest.freeMemory)}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {((latest.freeMemory / latest.totalMemory) * 100).toFixed(1)}% free
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Available</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">{formatBytes(latest.availableMemory)}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                For applications
              </div>
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
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.time ?? ''}
                    formatter={(value: unknown) => (
                      <div className="flex w-full items-center justify-between gap-8">
                        <span className="text-muted-foreground">Memory Usage</span>
                        <span className="ml-auto font-mono font-bold tabular-nums">
                          {(value as number).toFixed(1)}%
                        </span>
                      </div>
                    )}
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
    </div>
  )
}
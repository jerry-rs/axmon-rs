import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Cpu, MemoryStick, HardDrive, Layers } from 'lucide-react'
import { useHomeStream } from './hooks/use-home-stream'

interface MetricColors {
  text: string
  bg: string
  spark: string
}

function metricColors(value: number, yellowAt: number, redAt: number): MetricColors {
  const suffix = value >= redAt ? 'red-500' : value >= yellowAt ? 'yellow-500' : 'green-500'
  return {
    text: `text-${suffix}`,
    bg: `bg-${suffix}`,
    spark: `var(--color-${suffix})`,
  }
}

function Sparkline({ data, color }: { data: { value: number }[]; color: string }) {
  if (data.length === 0) return null
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <Area dataKey="value" type="monotone" stroke={color} fill={color} fillOpacity={0.15} strokeWidth={1.5} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function HomePage() {
  const { events, latest, isLoading } = useHomeStream()

  const cpuHistory = useMemo(() => events.slice(-60).map((e) => ({ value: e.cpuUsage })), [events])
  const memHistory = useMemo(() => events.slice(-60).map((e) => ({ value: e.memUsage })), [events])
  const gpuMaxUtilUsageHistory = useMemo(() => events.slice(-60).map((e) => ({ value: e.gpuMaxUtilUsage })), [events])
  const gpuMaxMemUsageHistory = useMemo(() => events.slice(-60).map((e) => ({ value: e.gpuMaxMemUsage })), [events])
  const gpuMaxTempHistory = useMemo(() => events.slice(-60).map((e) => ({ value: e.gpuMaxTemperature })), [events])

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground">
        <Spinner /> Loading dashboard...
      </div>
    )
  }

  if (!latest) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        No data available
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Welcome to AXMON</h1>
        <p className="text-sm text-muted-foreground">
          {latest.longOsVersion} · {latest.kernelLongVersion}
        </p>
      </div>

      {/* Row 1: CPU / MEM / DISK */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* CPU */}
        <Link to="/cpu" className="group flex flex-col">
          <Card className="flex-1 transition-shadow group-hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">CPU</CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="flex flex-1 flex-col space-y-3 min-h-0">
              <div>
                <div className={`text-2xl font-bold tabular-nums ${metricColors(latest.cpuUsage, 75, 90).text}`}>
                  {latest.cpuUsage.toFixed(1)}
                  <span className="text-sm font-normal text-muted-foreground">%</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${metricColors(latest.cpuUsage, 75, 90).bg}`}
                    style={{ width: `${Math.min(latest.cpuUsage, 100)}%` }}
                  />
                </div>
              </div>
              {cpuHistory.length > 0 && (
                <div className="flex-1 w-full min-h-0">
                  <Sparkline data={cpuHistory} color={metricColors(latest.cpuUsage, 50, 80).spark} />
                </div>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* MEM */}
        <Link to="/mem" className="group flex flex-col">
          <Card className="flex-1 transition-shadow group-hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Memory</CardTitle>
              <MemoryStick className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="flex flex-1 flex-col space-y-3 min-h-0">
              <div>
                <div className={`text-2xl font-bold tabular-nums ${metricColors(latest.memUsage, 75, 90).text}`}>
                  {latest.memUsage.toFixed(1)}
                  <span className="text-sm font-normal text-muted-foreground">%</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${metricColors(latest.memUsage, 75, 90).bg}`}
                    style={{ width: `${Math.min(latest.memUsage, 100)}%` }}
                  />
                </div>
              </div>
              {memHistory.length > 0 && (
                <div className="flex-1 w-full min-h-0">
                  <Sparkline data={memHistory} color={metricColors(latest.memUsage, 60, 85).spark} />
                </div>
              )}
            </CardContent>
          </Card>
        </Link>


        <div className='flex flex-col gap-3'>
        {/* DISK */}
        <Link to="/disk" className="group">
          <Card className="transition-shadow group-hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Disk</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div>
                <div className={`text-2xl font-bold flex justify-between items-center tabular-nums ${metricColors(latest.diskMaxUsage, 80, 90).text}`}>
                  <span>{latest.diskMaxUsage.toFixed(1)}
                    <span className="text-sm font-normal text-muted-foreground">%</span>
                  </span>
                   <p className="truncate text-xs text-muted-foreground">{latest.diskMountPoint}</p>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${metricColors(latest.diskMaxUsage, 80, 90).bg}`}
                    style={{ width: `${Math.min(latest.diskMaxUsage, 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* process */}
        <Link to="/process" className="group">
          <Card className="transition-shadow group-hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Processes</CardTitle>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">{latest.processCount.toLocaleString()}</div>
              <div className="mt-1 text-xs text-muted-foreground">All processes</div>
            </CardContent>
          </Card>
          </Link>
        </div>
      </div>

      {/* Row 2: GPU */}
      <div className="grid gap-4 sm:grid-cols-1">
        {/* GPU */}
        <Link to="/gpu" className="group">
          <Card className="transition-shadow group-hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">GPU</CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground whitespace-nowrap w-20">Max Util</span>
                  {gpuMaxUtilUsageHistory.length > 0 && (
                    <div className="h-10 w-full">
                      <Sparkline data={gpuMaxUtilUsageHistory} color={metricColors(latest.gpuMaxUtilUsage, 80, 90).spark} />
                    </div>
                  )}
                  <span className={`font-medium tabular-nums w-15 text-right ${metricColors(latest.gpuMaxUtilUsage, 80, 90).text}`}>
                    {latest.gpuMaxUtilUsage.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground whitespace-nowrap w-20">Max Mem</span>
                  {gpuMaxMemUsageHistory.length > 0 && (
                    <div className="h-10 w-full">
                      <Sparkline data={gpuMaxMemUsageHistory} color={metricColors(latest.gpuMaxMemUsage, 80, 90).spark} />
                    </div>
                  )}
                  <span className={`font-medium tabular-nums w-15 text-right ${metricColors(latest.gpuMaxMemUsage, 80, 90).text}`}>
                    {latest.gpuMaxMemUsage.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground whitespace-nowrap w-20">Max Temp</span>
                  {gpuMaxTempHistory.length > 0 && (
                    <div className="h-10 w-full">
                      <Sparkline data={gpuMaxTempHistory} color={metricColors(latest.gpuMaxTemperature, 75, 85).spark} />
                    </div>
                  )}
                  <span className={`font-medium tabular-nums w-15 text-right ${metricColors(latest.gpuMaxTemperature, 75, 85).text}`}>
                    {latest.gpuMaxTemperature}°C
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}

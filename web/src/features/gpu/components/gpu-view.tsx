import { useMemo } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { Cpu, Thermometer, MemoryStick, AlertCircle, Info, Terminal } from 'lucide-react'
import { formatBytes } from '@/lib/format'
import { useGpuStream } from '../hooks/use-gpu-stream'
import { useGpuVersion } from '../hooks/use-gpu-version'

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
]

function usageColor(usage: number): string {
  if (usage >= 90) return 'text-red-500'
  if (usage >= 80) return 'text-yellow-500'
  return 'text-green-500'
}

function usageBgColor(usage: number): string {
  if (usage >= 90) return 'bg-red-500'
  if (usage >= 80) return 'bg-yellow-500'
  return 'bg-green-500'
}

function tempColor(temp: number): string {
  if (temp >= 85) return 'text-red-500'
  if (temp >= 75) return 'text-yellow-500'
  return 'text-green-500'
}

function GpuLineChart({
  title,
  data,
  dataKeyPrefix,
  suffix,
  gpus,
  domain,
}: {
  title: string
  data: Record<string, number | string>[]
  dataKeyPrefix: string
  suffix: string
  gpus: { index: number; name: string }[]
  domain: [number, number | 'auto']
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="text-xs text-muted-foreground">
          {data.length > 0 && `${data.length} data points`}
        </div>
      </CardHeader>
      <CardContent>
        <div className="aspect-[3/1] min-h-[150px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
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
                domain={domain}
                allowDataOverflow={false}
                tickFormatter={(v: number) => `${v}${suffix}`}
                fontSize={12}
                stroke="hsl(var(--muted-foreground))"
                width={50}
              />
              <Tooltip
                labelFormatter={(label) => label as string}
                formatter={(value, name) => {
                  const match = String(name).match(/^gpu(\d+)/)
                  const idx = match ? Number(match[1]) : -1
                  const gpuLabel = gpus.find((g) => g.index === idx)?.name ?? name
                  return [`${value}${suffix}`, gpuLabel]
                }}
              />
              {gpus.map((gpu, i) => (
                <Area
                  key={gpu.index}
                  dataKey={`gpu${gpu.index}${dataKeyPrefix}`}
                  type="linear"
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                  fillOpacity={0.05}
                  strokeWidth={2}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export function GpuView() {
  const { events, latest, error: streamError, isLoading: streamLoading } = useGpuStream()
  const { data: version, isLoading: versionLoading } = useGpuVersion()

  const maxUtil = latest ? Math.max(...latest.gpus.map((g) => g.util)) : 0
  const maxMem = latest ? Math.max(...latest.gpus.map((g) => g.mUtil)) : 0
  const maxTemp = latest ? Math.max(...latest.gpus.map((g) => g.temperature)) : 0

  const chartData = useMemo(
    () =>
      events.map((e) => {
        const point: Record<string, number | string> = {
          time: new Date(e.timestamp * 1000).toLocaleTimeString(),
        }
        e.gpus.forEach((gpu) => {
          point[`gpu${gpu.index}Util`] = Number(gpu.util.toFixed(1))
          point[`gpu${gpu.index}Mem`] = Number(gpu.mUtil.toFixed(1))
          point[`gpu${gpu.index}Temp`] = gpu.temperature
        })
        return point
      }),
    [events],
  )

  if (streamLoading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground">
        <Spinner /> Loading GPU data...
      </div>
    )
  }

  if (streamError) {
    return (
      <div className="flex items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-lg">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{streamError}</AlertDescription>
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
            <h1 className="text-2xl font-bold tracking-tight">GPU Monitor</h1>
            <p className="text-sm text-muted-foreground">Real-time GPU performance</p>
          </div>
        </div>
      </div>

      {/* Driver Info */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">GPU Version</CardTitle>
          <Info className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {versionLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner /> Loading...
            </div>
          ) : version ? (
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Driver: </span>
                <span className="font-mono font-medium">{version.driverVersion}</span>
              </div>
              <div>
                <span className="text-muted-foreground">NVML: </span>
                <span className="font-mono font-medium">{version.nvmlVersion}</span>
              </div>
              <div>
                <span className="text-muted-foreground">CUDA: </span>
                <span className="font-mono font-medium">{version.cudaVersion}</span>
              </div>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </CardContent>
      </Card>

      {/* Stats Grid */}
      {latest && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">GPU Count</CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums">{latest.gpus.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Max Util</CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold tabular-nums ${usageColor(maxUtil)}`}>
                {maxUtil.toFixed(1)}
                <span className="text-lg font-normal text-muted-foreground">%</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Max Mem</CardTitle>
              <MemoryStick className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold tabular-nums ${usageColor(maxMem)}`}>
                {maxMem.toFixed(1)}
                <span className="text-lg font-normal text-muted-foreground">%</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Max Temp</CardTitle>
              <Thermometer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold tabular-nums ${tempColor(maxTemp)}`}>
                {maxTemp}
                <span className="text-lg font-normal">°C</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      {latest && (
        <div className="space-y-4">
          <GpuLineChart
            title="GPU Utilization"
            data={chartData}
            dataKeyPrefix="Util"
            suffix="%"
            gpus={latest.gpus}
            domain={[0, 100]}
          />
          <GpuLineChart
            title="GPU Memory"
            data={chartData}
            dataKeyPrefix="Mem"
            suffix="%"
            gpus={latest.gpus}
            domain={[0, 100]}
          />
          <GpuLineChart
            title="GPU Temperature"
            data={chartData}
            dataKeyPrefix="Temp"
            suffix="°C"
            gpus={latest.gpus}
            domain={[0, 'auto']}
          />
        </div>
      )}

      {/* Per-GPU Cards */}
      {latest?.gpus && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">GPUs</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 xl:grid-cols-2">
          {latest.gpus.map((gpu) => (
            <div key={gpu.index} className="rounded-lg border bg-muted/30 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-base font-medium">{gpu.name}</div>
                  <p className="text-xs text-muted-foreground">
                    {gpu.brand} · {gpu.architecture} · {gpu.busId}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className={`tabular-nums ${usageColor(gpu.util)}`}>
                    {gpu.util.toFixed(1)}% util
                  </span>
                  <span className={`tabular-nums ${usageColor(gpu.mUtil)}`}>
                    {gpu.mUtil.toFixed(1)}% mem
                  </span>
                  <span className={`tabular-nums font-medium ${tempColor(gpu.temperature)}`}>
                    {gpu.temperature}°C
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                {/* Util bar */}
                <div>
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>GPU Util</span>
                    <span className={usageColor(gpu.util)}>{gpu.util.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${usageBgColor(gpu.util)}`}
                      style={{ width: `${gpu.util}%` }}
                    />
                  </div>
                </div>
                {/* Memory bar */}
                <div>
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>Memory Util</span>
                    <span className={usageColor(gpu.mUtil)}>{gpu.mUtil.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${usageBgColor(gpu.mUtil)}`}
                      style={{ width: `${gpu.mUtil}%` }}
                    />
                  </div>
                </div>
                {/* Processes */}
                {gpu.processes.length > 0 && (
                  <div>
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Terminal className="h-3 w-3" />
                      Processes ({gpu.processes.length})
                    </div>
                    <div className="space-y-1.5">
                      {gpu.processes.map((proc) => (
                        <div
                          key={proc.pid}
                          className="rounded-md border bg-muted/50 px-2.5 py-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-medium">{proc.command}</span>
                            <Badge variant="secondary" className="text-[10px]">
                              PID {proc.pid}
                            </Badge>
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-muted-foreground">
                            <span>GPU Mem: {formatBytes(proc.usedGpuMemory)} / {formatBytes(proc.totalGpuMemory)}</span>
                            <span>CPU: {proc.cpuUsage.toFixed(1)}%</span>
                            <span>RAM: {formatBytes(proc.cpuMem)}</span>
                            <span>User: {proc.user}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {gpu.processes.length === 0 && (
                  <p className="text-xs text-muted-foreground">No running processes</p>
                )}
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

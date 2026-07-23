import { useDiskInfo } from '../hooks/use-disk-info'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { AlertCircle, HardDrive, Activity, Layers, Zap } from 'lucide-react'
import { formatBytes } from '@/lib/format'

function usageColor(usage: number): { text: string; bg: string } {
  if (usage >= 90) return { text: 'text-red-500', bg: 'bg-red-500' }
  if (usage >= 80) return { text: 'text-yellow-500', bg: 'bg-yellow-500' }
  return { text: 'text-green-500', bg: 'bg-green-500' }
}

export function DiskView() {
  const { data: diskInfo, isLoading, error } = useDiskInfo()
  const disks = diskInfo?.disks ?? []

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Spinner />Loading disk data...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-lg">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (disks.length === 0) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-chart-1/10 p-2">
            <HardDrive className="h-6 w-6 text-chart-1" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Disk Monitor</h1>
            <p className="text-sm text-muted-foreground">Storage usage across devices</p>
          </div>
        </div>
        <div className="flex h-48 items-center justify-center text-muted-foreground">
          No disks found
        </div>
      </div>
    )
  }

  // Calculate aggregate stats
  const totalUsed = disks.reduce((sum, d) => sum + d.usedSpace, 0)
  const totalSpace = disks.reduce((sum, d) => sum + d.totalSpace, 0)
  const overallUsage = totalSpace > 0 ? (totalUsed / totalSpace) * 100 : 0
  const maxDisk = disks.reduce((max, d) => d.diskUsage > max.diskUsage ? d : max, disks[0])
  const maxUsage = maxDisk?.diskUsage ?? 0

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-chart-1/10 p-2">
            <HardDrive className="h-6 w-6 text-chart-1" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Disk Monitor</h1>
            <p className="text-sm text-muted-foreground">Storage usage across devices</p>
          </div>
        </div>
      </div>

      {/* Aggregate Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overall Usage</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold tabular-nums ${usageColor(overallUsage).text}`}>
              {overallUsage.toFixed(1)}
              <span className="text-lg font-normal text-muted-foreground">%</span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full rounded-full transition-all duration-500 ${usageColor(overallUsage).bg}`}
                style={{ width: `${overallUsage}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Used</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{formatBytes(totalUsed)}</div>
            <div className="mt-1 text-xs text-muted-foreground">Across all disks</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Capacity</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{formatBytes(totalSpace)}</div>
            <div className="mt-1 text-xs text-muted-foreground">Installed</div>
          </CardContent>
        </Card>
      </div>

      {/* Max Disk */}
      <div className="grid gap-4 sm:grid-cols-1">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Max Disk Usage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-3xl font-bold tabular-nums ${usageColor(maxUsage).text}`}>
                  {maxUsage.toFixed(1)}
                  <span className="text-lg font-normal text-muted-foreground">%</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{maxDisk?.mountPoint}</div>
                {/*<div className="text-xs text-muted-foreground">{maxDisk?.name}</div>*/}
              </div>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full rounded-full transition-all duration-500 ${usageColor(maxUsage).bg}`}
                style={{ width: `${maxUsage}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-Disk Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {disks.map((disk) => (
          <Card key={disk.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-base font-medium">{disk.name}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {disk.fileSystem} · <span className="inline-block max-w-[200px] truncate align-bottom">{disk.mountPoint}</span>
                </p>
              </div>
              <span className={`font-mono text-2xl font-bold tabular-nums ${usageColor(disk.diskUsage).text}`}>
                {disk.diskUsage.toFixed(1)}
                <span className="text-base font-normal text-muted-foreground">%</span>
              </span>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${usageColor(disk.diskUsage).bg}`}
                  style={{ width: `${disk.diskUsage}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Used: {formatBytes(disk.usedSpace)}</span>
                <span>Free: {formatBytes(disk.availableSpace)}</span>
                <span>Total: {formatBytes(disk.totalSpace)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

import { useMemo } from 'react'
import { useDockerImages } from '../hooks/use-docker-images'
import { useDockerContainers } from '../hooks/use-docker-containers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { AlertCircle, Container, Image } from 'lucide-react'
import { ImageTable } from './image-table'
import { ContainerTable } from './container-table'

// ── helpers ──────────────────────────────────

function ErrorBlock({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}

function LoadingBlock({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
      <Spinner /> {label}
    </div>
  )
}

// ── view ─────────────────────────────────────

export function DockerView() {
  const { data: imagesData, isLoading: imagesLoading, error: imagesError } = useDockerImages()
  const { data: containersData, isLoading: containersLoading, error: containersError } = useDockerContainers()

  const imagesList = useMemo(() => imagesData?.images ?? [], [imagesData])
  const containersList = useMemo(() => containersData?.containers ?? [], [containersData])

  const runningContainers = containersList.filter((c) => c.state === 'running').length
  const totalContainers = containersList.length
  const totalImages = imagesList.length

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-chart-1/10 p-2">
          <Container className="h-6 w-6 text-chart-1" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Docker Monitor</h1>
          <p className="text-sm text-muted-foreground">
            Images & Containers overview
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Images
            </CardTitle>
            <Image className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {imagesError ? (
              <div className="text-sm text-destructive">Failed to load</div>
            ) : imagesLoading ? (
              <Spinner />
            ) : (
              <>
                <div className="text-2xl font-bold tabular-nums">{totalImages}</div>
                <div className="mt-1 text-xs text-muted-foreground">All images</div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Containers
            </CardTitle>
            <Container className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {containersError ? (
              <div className="text-sm text-destructive">Failed to load</div>
            ) : containersLoading ? (
              <Spinner />
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold tabular-nums">{totalContainers}</div>
                  <div className="text-xs text-muted-foreground">All containers</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold tabular-nums text-green-500">
                    {runningContainers}
                  </div>
                  <div className="text-xs text-muted-foreground">running</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Images Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Images
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {imagesLoading ? '...' : `${totalImages} images`}
          </span>
        </CardHeader>
        <CardContent>
          {imagesError ? (
            <ErrorBlock message={(imagesError as Error).message} />
          ) : imagesLoading ? (
            <LoadingBlock label="Loading images..." />
          ) : (
            <ImageTable images={imagesList} />
          )}
        </CardContent>
      </Card>

      {/* Containers Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Containers
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {containersLoading ? '...' : `${totalContainers} containers`}
          </span>
        </CardHeader>
        <CardContent>
          {containersError ? (
            <ErrorBlock message={(containersError as Error).message} />
          ) : containersLoading ? (
            <LoadingBlock label="Loading containers..." />
          ) : (
            <ContainerTable containers={containersList} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

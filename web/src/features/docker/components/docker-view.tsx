import { useMemo } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useDockerImages } from '../hooks/use-docker-images'
import { useDockerContainers } from '../hooks/use-docker-containers'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { AlertCircle, Container, Image } from 'lucide-react'
import { formatBytes, formatTimestamp } from '@/lib/format'
import type { Image as DockerImage, Container as DockerContainer } from '../types'

// ── Image table ──────────────────────────────

const imageColumnHelper = createColumnHelper<DockerImage>()

const imageColumns = [
  imageColumnHelper.display({
    id: 'index',
    header: '#',
    cell: (info) => (
      <span className="text-xs text-muted-foreground tabular-nums">
        {info.row.index + 1}
      </span>
    ),
    size: 40,
  }),
  imageColumnHelper.accessor('id', {
    header: 'ID',
    cell: (info) => (
      <span className="font-mono text-xs text-muted-foreground">
        {info.getValue().slice(7, 19)}
      </span>
    ),
  }),
  imageColumnHelper.accessor('repoTags', {
    header: 'Repository',
    cell: (info) => {
      const tags = info.getValue()
      const primary = tags[0] ?? '<none>'
      return (
        <div className="flex items-center gap-2">
          <Image className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate font-mono text-xs">{primary}</span>
          {tags.length > 1 && (
            <span className="shrink-0 text-xs text-muted-foreground">
              +{tags.length - 1}
            </span>
          )}
        </div>
      )
    },
  }),
  imageColumnHelper.accessor('created', {
    header: 'Created',
    cell: (info) => formatTimestamp(info.getValue()),
  }),
  imageColumnHelper.accessor('size', {
    header: 'Size',
    cell: (info) => (
      <span className="tabular-nums">{formatBytes(info.getValue())}</span>
    ),
  }),
  imageColumnHelper.accessor('sharedSize', {
    header: 'Shared',
    cell: (info) => (
      <span className="tabular-nums">{formatBytes(info.getValue())}</span>
    ),
  }),

]

// ── Container table ──────────────────────────

const containerColumnHelper = createColumnHelper<DockerContainer>()

const containerColumns = [
  containerColumnHelper.display({
    id: 'index',
    header: '#',
    cell: (info) => (
      <span className="text-xs text-muted-foreground tabular-nums">
        {info.row.index + 1}
      </span>
    ),
    size: 40,
  }),
  containerColumnHelper.accessor('id', {
    header: 'ID',
    cell: (info) => (
      <span className="font-mono text-xs text-muted-foreground">
        {info.getValue()?.slice(0, 12) ?? '—'}
      </span>
    ),
  }),
  containerColumnHelper.accessor('names', {
    header: 'Name',
    cell: (info) => {
      const names = info.getValue()
      const displayName = names?.[0]?.replace(/^\//, '') ?? '—'
      return <span className="font-medium">{displayName}</span>
    },
  }),
  containerColumnHelper.accessor('image', {
    header: 'Image',
    cell: (info) => (
      <span className="text-muted-foreground">{info.getValue() ?? '—'}</span>
    ),
  }),
  containerColumnHelper.accessor('created', {
    header: 'Created',
    cell: (info) => {
      const val = info.getValue()
      return val != null ? formatTimestamp(val) : '—'
    },
  }),
  containerColumnHelper.accessor('sizeRw', {
    header: 'Size RW',
    cell: (info) => {
      const val = info.getValue()
      return val != null ? formatBytes(val) : '—'
    },
  }),
  containerColumnHelper.accessor('sizeRootFs', {
    header: 'Size RootFS',
    cell: (info) => {
      const val = info.getValue()
      return val != null ? formatBytes(val) : '—'
    },
  }),
  containerColumnHelper.accessor('state', {
    header: 'State',
    cell: (info) => {
      const state = info.getValue()
      return (
        <Badge
          variant={
            state === 'running' ? 'default'
            : state === 'exited' ? 'destructive'
            : 'secondary'
          }
        >
          {state}
        </Badge>
      )
    },
  }),
  containerColumnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => (
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {info.getValue()}
      </span>
    ),
  }),
  containerColumnHelper.accessor('ports', {
    header: 'Ports',
    cell: (info) => {
      const ports = info.getValue()
      if (!ports || ports.length === 0) return <span className="text-xs text-muted-foreground">—</span>

      const first = ports[0]
      const ip = first.ip
      const publicPort = first.publicPort ?? null
      const privatePort = first.privatePort
      const portType = first.type ?? null

      const firstLabel = [
        ip ? `${ip}:` : '',
        publicPort != null ? `${publicPort}->` : '',
        `${privatePort}`,
        portType ? `/${portType}` : '',
      ]
        .filter(Boolean)
        .join('')

      return (
        <Popover>
          <PopoverTrigger className="inline-flex w-fit cursor-pointer items-center gap-1 whitespace-nowrap rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground transition-colors hover:bg-muted/80">
            <span>{firstLabel}</span>
            {ports.length > 1 && (
              <span className="text-[10px] text-muted-foreground/50">
                +{ports.length - 1}
              </span>
            )}
          </PopoverTrigger>
          <PopoverContent
            sideOffset={8}
            className="w-auto min-w-[280px] max-w-xs px-4 py-3"
          >
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Port Mappings ({ports.length})
            </p>
            <div className="space-y-1.5">
              {ports.map((p, i) => {
                const ip = p.ip
                const publicPort = p.publicPort ?? null
                const privatePort = p.privatePort
                const portType = p.type ?? null
                const label = [
                  ip ? `${ip}:` : '',
                  publicPort != null ? `${publicPort}->` : '',
                  `${privatePort}`,
                  portType ? `/${portType}` : '',
                ]
                  .filter(Boolean)
                  .join('')
                return (
                  <div
                    key={i}
                    className="flex items-center rounded bg-muted px-2 py-1 text-xs font-mono text-muted-foreground"
                  >
                    {label}
                  </div>
                )
              })}
            </div>
          </PopoverContent>
        </Popover>
      )
    },
  }),
  containerColumnHelper.accessor('command', {
    header: 'Command',
    cell: (info) => (
      <span className="truncate font-mono text-xs text-muted-foreground">
        {info.getValue() ?? '—'}
      </span>
    ),
  }),

]

// ── View ─────────────────────────────────────

export function DockerView() {
  const { data: imagesData, isLoading: imagesLoading, error: imagesError } = useDockerImages()
  const { data: containersData, isLoading: containersLoading, error: containersError } = useDockerContainers()

  const isLoading = imagesLoading || containersLoading
  const error = imagesError ?? containersError

  const imagesList = useMemo(() => imagesData?.images ?? [], [imagesData])
  const containersList = useMemo(() => containersData?.containers ?? [], [containersData])

  const imageTable = useReactTable({
    data: imagesList,
    columns: imageColumns,
    getCoreRowModel: getCoreRowModel(),
  })

  const containerTable = useReactTable({
    data: containersList,
    columns: containerColumns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground">
        <Spinner /> Loading Docker data...
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
            <div className="text-2xl font-bold tabular-nums">{totalImages}</div>
            <div className="mt-1 text-xs text-muted-foreground">All images</div>
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
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold tabular-nums">{totalContainers}</div>
                <div className="text-xs text-muted-foreground">All containers</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold tabular-nums text-green-500">{runningContainers}</div>
                <div className="text-xs text-muted-foreground">running</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Images Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Images
          </CardTitle>
          <span className="text-xs text-muted-foreground">{totalImages} images</span>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                {imageTable.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-4 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {imageTable.getRowModel().rows.length > 0 ? (
                  imageTable.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="border-t border-border">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-2.5">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={imageColumns.length}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No images found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Containers Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Containers
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {totalContainers} containers
          </span>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                {containerTable.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-4 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {containerTable.getRowModel().rows.length > 0 ? (
                  containerTable.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="border-t border-border">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-2.5 whitespace-nowrap">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={containerColumns.length}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No containers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

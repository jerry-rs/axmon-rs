import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Cpu, Layers } from 'lucide-react'
import { formatBytes } from '@/lib/format'
import { useProcessStream } from '../hooks/use-process-stream'
import type { Process } from '../types'

const columnHelper = createColumnHelper<Process>()

const columns = [
  columnHelper.display({
    id: 'index',
    header: '#',
    cell: (info) => <span className="text-xs text-muted-foreground tabular-nums">{info.row.index + 1}</span>,
    size: 40,
  }),
  columnHelper.accessor('pid', {
    header: 'PID',
    cell: (info) => <span className="font-mono text-xs tabular-nums">{info.getValue()}</span>,
    size: 80,
  }),
  columnHelper.accessor('user', {
    header: 'User',
    cell: (info) => <span className="text-xs">{info.getValue()}</span>,
    size: 100,
  }),
  columnHelper.accessor('cpuUsage', {
    header: 'CPU',
    cell: (info) => (
      <span className="tabular-nums text-xs">{info.getValue().toFixed(1)}%</span>
    ),
    size: 70,
  }),
  columnHelper.accessor('memory', {
    header: 'Memory',
    cell: (info) => (
      <span className="tabular-nums text-xs">{formatBytes(info.getValue())}</span>
    ),
    size: 100,
  }),
  columnHelper.accessor('virtualMemory', {
    header: 'VMEM',
    cell: (info) => (
      <span className="tabular-nums text-xs">{formatBytes(info.getValue())}</span>
    ),
    size: 100,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => {
      const status = info.getValue()
      return (
        <Badge
          variant={
            status === 'Running' ? 'default'
            : status === 'Sleeping' ? 'secondary'
            : 'outline'
          }
          className="text-[10px]"
        >
          {status}
        </Badge>
      )
    },
    size: 80,
  }),
  columnHelper.accessor('command', {
    header: 'Command',
    cell: (info) => (
      <span className="truncate font-mono text-xs">{info.getValue()}</span>
    ),
    size: 300,
  }),
]

export function ProcessView() {
  const { latest, isLoading, error } = useProcessStream()
  const [sorting, setSorting] = useState<SortingState>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const headerRowRef = useRef<HTMLTableRowElement>(null)
  const [colWidths, setColWidths] = useState<number[]>([])

  const processes = useMemo(() => latest?.processes ?? [], [latest])

  const table = useReactTable({
    data: processes,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  useLayoutEffect(() => {
    if (headerRowRef.current) {
      const cells = headerRowRef.current.querySelectorAll('th')
      setColWidths(Array.from(cells).map((c) => c.getBoundingClientRect().width))
    }
  }, [processes.length])

  const { rows } = table.getRowModel()

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 36,
    overscan: 10,
  })

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground">
        <Spinner /> Loading processes...
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
            <h1 className="text-2xl font-bold tracking-tight">Process Monitor</h1>
            <p className="text-sm text-muted-foreground">Running processes overview</p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Processes</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums">{processes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Top CPU</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums">
              {processes.length > 0 ? Math.max(...processes.map((p) => p.cpuUsage)).toFixed(1) : '0.0'}
              <span className="text-lg font-normal text-muted-foreground">%</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Top Memory</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {formatBytes(processes.length > 0 ? Math.max(...processes.map((p) => p.memory)) : 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Top VMEM</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {formatBytes(processes.length > 0 ? Math.max(...processes.map((p) => p.virtualMemory)) : 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Process Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Process List</CardTitle>
          <span className="text-xs text-muted-foreground">{processes.length} processes</span>
        </CardHeader>
        <CardContent className="p-0">
          <div ref={scrollRef} className="h-[600px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-card">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} ref={headerGroup.id === table.getHeaderGroups()[0].id ? headerRowRef : undefined}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="cursor-pointer whitespace-nowrap border-b px-4 py-2 text-left text-xs font-medium text-muted-foreground"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: ' ↑',
                          desc: ' ↓',
                        }[header.column.getIsSorted() as string] ?? null}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                <tr>
                  <td colSpan={columns.length} className="p-0">
                    <div className="relative" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
                      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const row = rows[virtualRow.index]
                        return (
                          <div
                            key={row.id}
                            className="absolute left-0 top-0 flex w-full border-t border-border"
                            style={{
                              height: `${virtualRow.size}px`,
                              transform: `translateY(${virtualRow.start}px)`,
                            }}
                          >
                            {row.getVisibleCells().map((cell) => (
                              <div
                                key={cell.id}
                                className="flex items-center whitespace-nowrap px-4"
                                style={{ width: colWidths[cell.column.getIndex()] }}
                              >
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </div>
                            ))}
                          </div>
                        )
                      })}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatBytes, formatTimestamp } from '@/lib/format'
import type { Container as DockerContainer } from '../types'

const columnHelper = createColumnHelper<DockerContainer>()

const columns = [
  columnHelper.display({
    id: 'index',
    header: '#',
    cell: (info) => (
      <span className="text-xs text-muted-foreground tabular-nums">
        {info.row.index + 1}
      </span>
    ),
    size: 40,
  }),
  columnHelper.accessor('id', {
    header: 'ID',
    cell: (info) => (
      <span className="font-mono text-xs text-muted-foreground">
        {info.getValue()?.slice(0, 12) ?? '—'}
      </span>
    ),
  }),
  columnHelper.accessor('names', {
    header: 'Name',
    cell: (info) => {
      const names = info.getValue()
      const displayName = names?.[0]?.replace(/^\//, '') ?? '—'
      return <span className="font-medium">{displayName}</span>
    },
  }),
  columnHelper.accessor('image', {
    header: 'Image',
    cell: (info) => (
      <span className="text-muted-foreground">{info.getValue() ?? '—'}</span>
    ),
  }),
  columnHelper.accessor('created', {
    header: 'Created',
    cell: (info) => {
      const val = info.getValue()
      return val != null ? formatTimestamp(val) : '—'
    },
  }),
  columnHelper.accessor('sizeRw', {
    header: 'Size RW',
    cell: (info) => {
      const val = info.getValue()
      return val != null ? formatBytes(val) : '—'
    },
  }),
  columnHelper.accessor('sizeRootFs', {
    header: 'Size RootFS',
    cell: (info) => {
      const val = info.getValue()
      return val != null ? formatBytes(val) : '—'
    },
  }),
  columnHelper.accessor('state', {
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
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => (
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor('ports', {
    header: 'Ports',
    cell: (info) => {
      const ports = info.getValue()
      if (!ports || ports.length === 0) return <span className="text-xs text-muted-foreground">—</span>

      const first = ports[0]
      const firstLabel = [
        first.ip ? `${first.ip}:` : '',
        first.publicPort != null ? `${first.publicPort}->` : '',
        `${first.privatePort}`,
        first.type ? `/${first.type}` : '',
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
                const label = [
                  p.ip ? `${p.ip}:` : '',
                  p.publicPort != null ? `${p.publicPort}->` : '',
                  `${p.privatePort}`,
                  p.type ? `/${p.type}` : '',
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
  columnHelper.accessor('command', {
    header: 'Command',
    cell: (info) => (
      <span className="truncate font-mono text-xs text-muted-foreground">
        {info.getValue() ?? '—'}
      </span>
    ),
  }),
]

interface ContainerTableProps {
  containers: DockerContainer[]
}

export function ContainerTable({ containers }: ContainerTableProps) {
  const table = useReactTable({
    data: containers,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
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
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row) => (
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
                colSpan={columns.length}
                className="py-8 text-center text-muted-foreground"
              >
                No containers found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

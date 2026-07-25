import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Image } from 'lucide-react'
import { formatBytes, formatTimestamp } from '@/lib/format'
import type { Image as DockerImage } from '../types'

const columnHelper = createColumnHelper<DockerImage>()

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
        {info.getValue().slice(7, 19)}
      </span>
    ),
  }),
  columnHelper.accessor('repoTags', {
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
  columnHelper.accessor('created', {
    header: 'Created',
    cell: (info) => formatTimestamp(info.getValue()),
  }),
  columnHelper.accessor('size', {
    header: 'Size',
    cell: (info) => (
      <span className="tabular-nums">{formatBytes(info.getValue())}</span>
    ),
  }),
  columnHelper.accessor('sharedSize', {
    header: 'Shared',
    cell: (info) => (
      <span className="tabular-nums">{formatBytes(info.getValue())}</span>
    ),
  }),
]

interface ImageTableProps {
  images: DockerImage[]
}

export function ImageTable({ images }: ImageTableProps) {
  const table = useReactTable({
    data: images,
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
                  <td key={cell.id} className="px-4 py-2.5">
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
                No images found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

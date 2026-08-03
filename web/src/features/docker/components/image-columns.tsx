import type { ColumnDef } from "@tanstack/react-table";

import { formatBytes, formatTimeAgo } from "@/lib/format";

import type { ImageInfo } from "../api/docker-api";

// 列顺序对齐 `docker images`：REPOSITORY / TAG / IMAGE ID / CREATED / SIZE。
// 后端的 name 已经是合并好的 repo:tag，所以合成一列 NAME 放最前。

export const imageColumns: ColumnDef<ImageInfo>[] = [
  {
    id: "rank",
    header: "#",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.index + 1}</span>
    ),
  },
  {
    accessorKey: "id",
    header: "IMAGE ID",
    // API 返回的 id 带 "sha256:" 前缀，剥掉再截 12 位，跟 docker CLI 一致。
    cell: ({ row }) => (
      <span className="font-mono">
        {row.original.id.replace(/^sha256:/, "").slice(0, 12)}
      </span>
    ),
  },
  {
    accessorKey: "name",
    header: "NAME",
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "createdAt",
    header: "CREATED",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatTimeAgo(row.original.createdAt)}
      </span>
    ),
  },
  {
    accessorKey: "sizeBytes",
    header: () => <div className="text-right">SIZE</div>,
    cell: ({ row }) => (
      <div className="text-right">{formatBytes(row.original.sizeBytes)}</div>
    ),
  },
];

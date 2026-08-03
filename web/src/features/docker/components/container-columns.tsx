import type { ColumnDef } from "@tanstack/react-table";

import { formatBytes, formatTimeAgo } from "@/lib/format";

import type { ContainerInfo } from "../api/docker-api";

// 列顺序对齐 `docker ps -s`，PORTS 按页面要求挪到最后一列。
// 后端额外给的 STATE 作为状态圆点并入 STATUS 列；
// SIZE 复刻 `docker ps -s` 的 "12 MB (virtual 1.2 GB)" 格式。

function stateDotColor(state: string): string {
  switch (state.toLowerCase()) {
    case "running":
      return "bg-green-500";
    case "paused":
      return "bg-yellow-500";
    default:
      return "bg-red-500";
  }
}

function formatPorts(ports: ContainerInfo["ports"]): string {
  if (ports.length === 0) return "—";
  return ports
    .map((p) => {
      const dest = `${p.privatePort}/${p.protocol}`;
      if (p.publicPort == null) return dest;
      return p.ip ? `${p.ip}:${p.publicPort}→${dest}` : `:${p.publicPort}→${dest}`;
    })
    .join(", ");
}

export const containerColumns: ColumnDef<ContainerInfo>[] = [
  {
    id: "rank",
    header: "#",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.index + 1}</span>
    ),
  },
  {
    accessorKey: "id",
    header: "CONTAINER ID",
    cell: ({ row }) => (
      <span className="font-mono">{row.original.id.slice(0, 12)}</span>
    ),
  },
  // 后端已剥掉名字的前导 "/"（docker.rs 的 name 映射），拿不到名字时
  // 回退成 12 位短 id，直接显示即可。
  { accessorKey: "name", header: "NAMES" },
  { accessorKey: "image", header: "IMAGE" },

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
    accessorKey: "status",
    header: "STATUS",
    cell: ({ row }) => (
      <span className="flex items-center gap-1.5">
        <span
          className={`size-2 shrink-0 rounded-full ${stateDotColor(row.original.state)}`}
        />
        <span>{row.original.status}</span>
      </span>
    ),
  },

  {
    accessorKey: "sizeRwBytes",
    header: () => <div className="text-right">SIZE</div>,
    cell: ({ row }) => (
      <div className="text-right whitespace-nowrap">
        {formatBytes(row.original.sizeRwBytes)}
        <span className="text-muted-foreground">
          {" "}
          (virtual {formatBytes(row.original.sizeRootFsBytes)})
        </span>
      </div>
    ),
  },
  {
    accessorKey: "command",
    header: "COMMAND",
    cell: ({ row }) => (
      <span
        className="block max-w-48 truncate font-mono text-muted-foreground"
        title={row.original.command}
      >
        {row.original.command}
      </span>
    ),
  },
  {
    accessorKey: "ports",
    header: "PORTS",
    cell: ({ row }) => (
      <span
        className="block max-w-56 truncate font-mono text-muted-foreground"
        title={formatPorts(row.original.ports)}
      >
        {formatPorts(row.original.ports)}
      </span>
    ),
  },
];

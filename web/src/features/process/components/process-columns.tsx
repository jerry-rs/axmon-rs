import type { ColumnDef } from "@tanstack/react-table";

import { formatBytes } from "@/lib/format";

import type { ProcessInfo } from "../api/process-api";

/**
 * 列顺序对齐 top 的默认输出：PID USER … VIRT RES … %CPU … COMMAND。
 * 父 PID 不是 top 的默认列，但作为独立列保留（贴近 PID），其余字段
 * 仍按 top 的顺序排。# 排名是榜单的行号，不算数据列。
 * 标签页只切换榜单取数（对应 top 里按 P/M 换排序键）。
 */
export const processColumns: ColumnDef<ProcessInfo>[] = [
  {
    id: "rank",
    header: "#",
    cell: ({ row }) => <span className="text-muted-foreground">{row.index + 1}</span>,
  },
  { accessorKey: "pid", header: "PID" },
  {
    accessorKey: "ppid",
    header: "PPID",
    // init / 内核线程没有父进程（后端给 null）。
    cell: ({ row }) => row.original.ppid ?? "—",
  },
  {
    accessorKey: "user",
    header: "USER",
    cell: ({ row }) => row.original.user || "—",
  },
  {
    accessorKey: "cpuPercent",
    header: () => <div className="text-right">%CPU</div>,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">{row.original.cpuPercent.toFixed(1)}%</div>
    ),
  },
  {
    accessorKey: "memBytes",
    header: () => <div className="text-right">MEM (RSS)</div>,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">{formatBytes(row.original.memBytes)}</div>
    ),
  },
  {
    accessorKey: "virtualMemBytes",
    header: () => <div className="text-right">VIRT</div>,
    // 虚拟地址空间，含 mmap 和保留未用部分，通常远大于 RSS——
    // JVM/Go 进程动辄几 GiB 是正常的，不代表物理内存占用。
    cell: ({ row }) => (
      <div className="text-right text-muted-foreground tabular-nums">
        {formatBytes(row.original.virtualMemBytes)}
      </div>
    ),
  },

  {
    accessorKey: "name",
    header: "NAME",
    cell: ({ row }) => (
      <span className="block max-w-40 truncate font-medium" title={row.original.name}>
        {row.original.name}
      </span>
    ),
  },
  {
    accessorKey: "cmd",
    header: "COMMAND",
    cell: ({ row }) => {
      const cmd = row.original.cmd;
      if (!cmd) return "—";
      return (
        <span className="block max-w-64 truncate text-muted-foreground" title={cmd}>
          {cmd}
        </span>
      );
    },
  },
];

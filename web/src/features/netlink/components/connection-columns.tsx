import type { ColumnDef } from "@tanstack/react-table";

import type { ConnEntry } from "../api/netlink-api";

/**
 * 列与后端 ConnEntry 的五个字段一一对应，排列对齐 ss/netstat 的
 * 输出习惯：协议在前，本地端点 → 对端端点。IP 与端口拆成独立列
 * 而不是拼成 addr:port，方便按列扫读和对齐。
 * 没有对端（Listen / 未 connect 的 UDP）统一显示 "—"，同 process 页
 * 处理 null ppid 的方式。
 */
export const connectionColumns: ColumnDef<ConnEntry>[] = [
  {
    accessorKey: "protocol",
    header: () => <div className="text-left">PROTO</div>,
    cell: ({ row }) => (
      <div className="text-left font-medium uppercase">
        {row.original.protocol}
      </div>
    ),
  },
  {
    accessorKey: "localIp",
    header: () => <div className="text-left">LOCAL IP</div>,
    cell: ({ row }) => (
      <div className="text-left tabular-nums">{row.original.localIp}</div>
    ),
  },
  {
    accessorKey: "localPort",
    header: () => <div className="text-right">LOCAL PORT</div>,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">{row.original.localPort}</div>
    ),
  },
  {
    accessorKey: "remoteIp",
    header: () => <div className="text-left">REMOTE IP</div>,
    cell: ({ row }) => (
      <div className="text-left tabular-nums">
        {row.original.remoteIp ?? "—"}
      </div>
    ),
  },
  {
    accessorKey: "remotePort",
    header: () => <div className="text-right">REMOTE PORT</div>,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">
        {row.original.remotePort ?? "—"}
      </div>
    ),
  },
];

import type { ColumnDef } from "@tanstack/react-table";

import { formatBytes } from "@/lib/format";

import type { GpuProcessInfo } from "../api/gpu-api";

// 对应 nvidia-smi 的 Processes 一栏：PID / NAME / USED VRAM。
// 后端已按显存占用降序排好，前端不再重排。
export const gpuProcessColumns: ColumnDef<GpuProcessInfo>[] = [
  {
    id: "rank",
    header: "#",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.index + 1}</span>
    ),
  },
  {
    accessorKey: "pid",
    header: "PID",
    cell: ({ row }) => <span className="font-mono">{row.original.pid}</span>,
  },
  {
    accessorKey: "name",
    header: "NAME",
    // NVML 枚举到 sysinfo 解析之间进程刚好退出时为空字符串。
    cell: ({ row }) => row.original.name || "—",
  },
  {
    accessorKey: "gpuMemBytes",
    header: () => <div className="text-right">GRAM</div>,
    cell: ({ row }) => (
      <div className="text-right">
        {/* null = 驱动不报告按进程显存（Windows WDDM），跟 0 区分开 */}
        {row.original.gpuMemBytes != null
          ? formatBytes(row.original.gpuMemBytes)
          : "N/A"}
      </div>
    ),
  },
  {
    accessorKey: "cpuPercent",
    header: () => <div className="text-right">%CPU</div>,
    cell: ({ row }) => (
      <div className="text-right">{row.original.cpuPercent.toFixed(1)}</div>
    ),
  },
  {
    accessorKey: "cpuMemBytes",
    header: () => <div className="text-right">CPU MEM (RSS)</div>,
    cell: ({ row }) => (
      <div className="text-right">{formatBytes(row.original.cpuMemBytes)}</div>
    ),
  },
  {
    accessorKey: "cpuVirtualMemBytes",
    header: () => <div className="text-right">CPU VIRT</div>,
    cell: ({ row }) => (
      <div className="text-right">
        {formatBytes(row.original.cpuVirtualMemBytes)}
      </div>
    ),
  },

];

import { UsageBar } from "@/components/usage-bar";
import { formatBytes } from "@/lib/format";

import type { DiskInfo } from "../api/disk-api";

export function DiskList({ disks }: { disks: DiskInfo[] }) {
  // 监控视角"谁最满谁排前面"；total 为 0 的虚拟文件系统（procfs 之类）
  // 是噪声，过滤掉（后端保留它们是因为 usage_percent 恒 0 不算错数据）。
  const sorted = disks
    .filter((d) => d.totalBytes > 0)
    .sort((a, b) => b.usagePercent - a.usagePercent);

  if (sorted.length === 0) {
    return <p className="text-sm text-muted-foreground">No disks to display.</p>;
  }

  return (
    <div className="space-y-5">
      {sorted.map((disk) => {
        const usedBytes = disk.totalBytes - disk.availableBytes;
        return (
          <div key={disk.mountPoint} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-4">
              <p className="truncate text-sm font-medium">{disk.mountPoint}</p>
              <p className="text-sm tabular-nums">{disk.usagePercent.toFixed(1)}%</p>
            </div>
            <UsageBar percent={disk.usagePercent} />
            <div className="flex items-baseline justify-between gap-4 text-xs text-muted-foreground">
              <p className="truncate">
                {disk.name} · {disk.fileSystem}
              </p>
              <p className="shrink-0 tabular-nums">
                Used {formatBytes(usedBytes)} / {formatBytes(disk.totalBytes)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

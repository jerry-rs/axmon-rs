import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { DiskInfo } from "../api/disk-api";

/** 使用率达到这个值就算告急，和 UsageBar 的红色阈值一致。 */
const CRITICAL_PERCENT = 90;

export function DiskStatCards({ disks }: { disks: DiskInfo[] }) {
  // 使用率最高的排第一；空列表时后端还没采到盘（或全被过滤了）。
  const fullest = disks.length
    ? disks.reduce((a, b) => (b.usagePercent > a.usagePercent ? b : a))
    : null;
  const criticalCount = disks.filter((d) => d.usagePercent >= CRITICAL_PERCENT).length;

  const items = [
    { label: "Mounts", value: String(disks.length) },
    {
      label: "Fullest mount",
      value: fullest ? `${fullest.usagePercent.toFixed(1)}%` : "—",
      sub: fullest?.mountPoint,
    },
    { label: `Critical (≥${CRITICAL_PERCENT}%)`, value: String(criticalCount) },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader>
            <CardTitle className="text-xs font-normal text-muted-foreground">
              {item.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums text-green-500">{item.value}</p>
            {item.sub && (
              <p className="mt-1 truncate text-xs text-muted-foreground">{item.sub}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

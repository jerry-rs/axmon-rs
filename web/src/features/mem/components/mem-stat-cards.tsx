import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBytes } from "@/lib/format";

interface MemStatCardsProps {
  totalBytes: number;
  usedBytes: number;
}

export function MemStatCards({ totalBytes, usedBytes }: MemStatCardsProps) {
  // 空闲 = 总量 - 已用（即 /proc/meminfo 的 MemFree），这三个数严格相加等于总量。
  // 后端的 availableBytes（MemAvailable）不是"已用"的补数：它是含可回收缓存的
  // "还能分配多少"估值，和已用相加会超过总量——不放在一起并列，见 mem-page。
  const freeBytes = Math.max(0, totalBytes - usedBytes);
  const items = [
    { label: "Total", value: totalBytes },
    { label: "Used (incl. page cache)", value: usedBytes },
    { label: "Free", value: freeBytes },
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
            <p className="text-2xl font-semibold tabular-nums text-green-500 ">{formatBytes(item.value)}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

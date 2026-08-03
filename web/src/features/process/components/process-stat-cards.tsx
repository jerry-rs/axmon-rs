import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBytes } from "@/lib/format";

import type { ProcessMetric } from "../api/process-api";

export function ProcessStatCards({ metric }: { metric: ProcessMetric }) {
  const cpuTop = metric.topByCpu[0];
  const memTop = metric.topByMem[0];

  const items = [
    { label: "Processes", value: String(metric.processCount) },
    {
      label: "Top by CPU",
      value: cpuTop ? `${cpuTop.cpuPercent.toFixed(1)}%` : "—",
      sub: cpuTop?.name,
    },
    {
      label: "Top by MEM",
      value: memTop ? formatBytes(memTop.memBytes) : "—",
      sub: memTop?.name,
    },
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
            <p className="text-2xl font-semibold tabular-nums">{item.value}</p>
            {item.sub && (
              <p className="mt-1 truncate text-xs text-muted-foreground">{item.sub}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

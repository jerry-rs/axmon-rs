import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Freshness } from "@/components/freshness";

import { useDiskMetric } from "../hooks/use-disk-metric";
import { DiskStatCards } from "../components/disk-stat-cards";
import { DiskList } from "../components/disk-list";

export function DiskPage() {
  const { data, isPending, isError, error } = useDiskMetric();

  if (isPending) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner />
        Loading…
      </p>
    );
  }
  if (isError) {
    return <p className="text-sm text-red-500">{error.message}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Disks</h1>
        <Freshness collectedAtUnixMs={data.collectedAtUnixMs} staleAfterMs={15_000} />
      </div>

      <DiskStatCards disks={data.disks} />

      <Card>
        <CardHeader>
          <CardTitle>Usage by Mount Point</CardTitle>
        </CardHeader>
        <CardContent>
          <DiskList disks={data.disks} />
        </CardContent>
      </Card>
    </div>
  );
}

import { Gpu } from "lucide-react";

import { Freshness } from "@/components/freshness";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent } from "@/components/ui/card";

import { GpuCard } from "../components/gpu-card";
import { GpuStatCards } from "../components/gpu-stat-cards";
import { useGpuHistory } from "../hooks/use-gpu-history";

export function GpuPage() {
  const { data, error, isLoading, histories } = useGpuHistory();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-destructive">
          Failed to load GPU metrics: {error?.message || "Unknown error"}
        </CardContent>
      </Card>
    );
  }

  // 没有 NVIDIA 驱动 / NVML 初始化失败：后端用 available=false 表达，
  // 这比抛错更准确——功能不可用，不是采集失败。
  if (!data.available) {
    return (
      <div className="space-y-6">
        <div className="flex items-baseline justify-between">
          <h1 className="text-3xl font-bold tracking-tight">GPU</h1>
          <Freshness collectedAtUnixMs={data.collectedAtUnixMs} staleAfterMs={10_000} />
        </div>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Gpu className="size-10 text-muted-foreground" />
            <p className="text-lg font-medium">No NVIDIA GPU</p>
            <p className="max-w-md text-sm text-muted-foreground">
              No NVIDIA driver or NVML library was found on this machine. If an
              NVIDIA GPU is present, install the driver and this page will
              light up.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-3xl font-bold tracking-tight">GPU</h1>
        <Freshness collectedAtUnixMs={data.collectedAtUnixMs} staleAfterMs={10_000} />
      </div>

      <GpuStatCards metric={data} />

      {data.gpus.map((gpu) => (
        <GpuCard key={gpu.index} gpu={gpu} history={histories[gpu.index] ?? []} />
      ))}
    </div>
  );
}

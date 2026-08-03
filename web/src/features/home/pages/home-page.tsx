import {
  Container,
  Cpu,
  Gpu,
  HardDrive,
  ListTree,
  MemoryStick,
} from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { formatBytes } from "@/lib/format";

import { useOverview } from "../hooks/use-overview";
import { OverviewCard } from "../components/overview-card";

export function HomePage() {
  const { data, isPending, isError, error } = useOverview();

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

  const fullestDisk = data.disk.disks.length
    ? data.disk.disks.reduce((a, b) => (b.usagePercent > a.usagePercent ? b : a))
    : null;
  const runningContainers = data.docker.containers.filter(
    (c) => c.state === "running",
  ).length;
  const healthyGpus = data.gpu.gpus.filter((g) => g.healthy).length;

  return (
    <div className="space-y-6">
      <div className="space-y-3 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome to Axmon</h1>
        <p className="text-sm text-muted-foreground">
          Real-time monitoring for CPU, memory, disks, processes, Docker and GPUs.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <OverviewCard
          to="/cpu"
          title="CPU"
          icon={Cpu}
          value={`${data.cpu.globalUsagePercent.toFixed(1)}%`}
          sub={`${data.cpu.perCoreUsagePercent.length} cores`}
          percent={data.cpu.globalUsagePercent}
        />
        <OverviewCard
          to="/mem"
          title="Memory"
          icon={MemoryStick}
          value={`${data.mem.usagePercent.toFixed(1)}%`}
          sub={`Used ${formatBytes(data.mem.usedBytes)} / ${formatBytes(data.mem.totalBytes)}`}
          percent={data.mem.usagePercent}
        />
        <OverviewCard
          to="/disk"
          title="Disks"
          icon={HardDrive}
          value={fullestDisk ? `${fullestDisk.usagePercent.toFixed(1)}%` : "—"}
          sub={
            fullestDisk
              ? `Fullest: ${fullestDisk.mountPoint} · ${data.disk.disks.length} mounts`
              : "No disks"
          }
          percent={fullestDisk?.usagePercent}
        />
        <OverviewCard
          to="/process"
          title="Processes"
          icon={ListTree}
          value={String(data.process.processCount)}
          sub="Total running processes"
        />
        <OverviewCard
          to="/docker"
          title="Docker"
          icon={Container}
          value={`${runningContainers} / ${data.docker.containers.length}`}
          sub={`Running containers · ${data.docker.images.length} images`}
          unavailable={!data.docker.available}
        />
        <OverviewCard
          to="/gpu"
          title="GPU"
          icon={Gpu}
          value={`${healthyGpus} / ${data.gpu.gpus.length}`}
          sub="Healthy cards"
          unavailable={!data.gpu.available}
        />
      </div>
    </div>
  );
}

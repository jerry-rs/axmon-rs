import { Container } from "lucide-react";

import { Freshness } from "@/components/freshness";
import { Spinner } from "@/components/ui/spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";

import { containerColumns } from "../components/container-columns";
import { DockerStatCards } from "../components/docker-stat-cards";
import { imageColumns } from "../components/image-columns";
import { useDockerMetric } from "../hooks/use-docker-metric";

export function DockerPage() {
  const { data, error, isLoading } = useDockerMetric();

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
          Failed to load Docker metrics: {error?.message || "Unknown error"}
        </CardContent>
      </Card>
    );
  }

  // Docker socket 连不上：后端用 available=false + 空数组表达，
  // 这比抛错更准确——功能不可用，不是采集失败。
  if (!data.available) {
    return (
      <div className="space-y-6">
        <div className="flex items-baseline justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Docker</h1>
          <Freshness collectedAtUnixMs={data.collectedAtUnixMs} staleAfterMs={30_000} />
        </div>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Container className="size-10 text-muted-foreground" />
            <p className="text-lg font-medium">Docker unavailable</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Docker is not installed or the daemon is not running on this
              machine. Start the Docker daemon and this page will light up.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Docker</h1>
        <Freshness collectedAtUnixMs={data.collectedAtUnixMs} staleAfterMs={0} />
      </div>

      <DockerStatCards metric={data} />

      <Card>
        <CardHeader>
          <CardTitle>Images</CardTitle>
          <CardDescription>
            {data.images.length === 0
              ? "No images"
              : `${data.images.length} images, sorted by size descending`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={imageColumns}
            data={data.images}
            emptyMessage="No images"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Containers</CardTitle>
          <CardDescription>
            {data.containers.length === 0
              ? "No containers"
              : `${data.containers.length} containers — running first, like docker ps`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={containerColumns}
            data={data.containers}
            emptyMessage="No containers"
          />
        </CardContent>
      </Card>
    </div>
  );
}

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import type { DockerMetric } from "../api/docker-api";

interface DockerStatCardsProps {
  metric: DockerMetric;
}

export function DockerStatCards({ metric }: DockerStatCardsProps) {
  const running = metric.containers.filter(
    (c) => c.state.toLowerCase() === "running",
  ).length;
  const stopped = metric.containers.length - running;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader>
          <CardDescription>Images</CardDescription>
          <CardTitle className="text-2xl tabular-nums">
            {metric.images.length}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Running containers</CardDescription>
          <CardTitle className="text-2xl tabular-nums">{running}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Stopped containers</CardDescription>
          <CardTitle className="text-2xl tabular-nums">{stopped}</CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}

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
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardDescription>Images</CardDescription>
          <CardTitle className="text-2xl tabular-nums text-green-500">
            {metric.images.length}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Containers</CardDescription>
          <CardTitle className="text-2xl tabular-nums text-green-500">
            {running}
            <span className="text-sm font-normal text-muted-foreground">
              {" "}
              / {stopped} stopped
            </span>
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}

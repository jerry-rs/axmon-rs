import { useState } from "react";

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Freshness } from "@/components/freshness";

import { useProcessMetric } from "../hooks/use-process-metric";
import { ProcessStatCards } from "../components/process-stat-cards";
import { processColumns } from "../components/process-columns";

type TopMode = "cpu" | "mem";

export function ProcessPage() {
  const { data, isPending, isError, error } = useProcessMetric();
  const [mode, setMode] = useState<TopMode>("cpu");

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
        <h1 className="text-2xl font-semibold tracking-tight">Processes</h1>
        <Freshness collectedAtUnixMs={data.collectedAtUnixMs} staleAfterMs={10_000} />
      </div>

      <ProcessStatCards metric={data} />

      <Card>
        <CardHeader>
          <CardTitle>Top 10 Processes</CardTitle>
          <CardAction>
            <Tabs value={mode} onValueChange={(v) => setMode(v as TopMode)}>
              <TabsList>
                <TabsTrigger value="cpu">CPU</TabsTrigger>
                <TabsTrigger value="mem">MEM</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardAction>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={processColumns}
            data={mode === "cpu" ? data.topByCpu : data.topByMem}
          />
        </CardContent>
      </Card>
    </div>
  );
}

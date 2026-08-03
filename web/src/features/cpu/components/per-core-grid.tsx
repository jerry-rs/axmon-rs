import { UsageBar } from "@/components/usage-bar";

export function PerCoreGrid({ perCore }: { perCore: number[] }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
      {perCore.map((usage, index) => (
        <div key={index} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Core {index}</span>
            <span className="tabular-nums">{usage.toFixed(1)}%</span>
          </div>
          <UsageBar percent={usage} />
        </div>
      ))}
    </div>
  );
}

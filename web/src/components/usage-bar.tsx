import { cn } from "@/lib/utils";

interface UsageBarProps {
  percent: number;
  className?: string;
}

function barColor(percent: number): string {
  if (percent >= 90) return "bg-red-500";
  if (percent >= 70) return "bg-amber-500";
  return "bg-emerald-500";
}

export function UsageBar({ percent, className }: UsageBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className={cn("h-full rounded-full transition-[width] duration-500", barColor(clamped))}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

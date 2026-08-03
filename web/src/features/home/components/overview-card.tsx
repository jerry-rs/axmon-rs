import { NavLink } from "react-router";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsageBar } from "@/components/usage-bar";

interface OverviewCardProps {
  to: string;
  title: string;
  icon: LucideIcon;
  /** 大字主值，如 "22.3%"。 */
  value: string;
  /** 主值下方的次要说明。 */
  sub?: string;
  /** 传了就渲染 UsageBar（百分比类指标）。 */
  percent?: number;
  /** 该功能不可用（无 NVIDIA 驱动 / Docker socket 连不上）。 */
  unavailable?: boolean;
}

export function OverviewCard({
  to,
  title,
  icon: Icon,
  value,
  sub,
  percent,
  unavailable,
}: OverviewCardProps) {
  return (
    <NavLink to={to} className="block transition-opacity hover:opacity-80">
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Icon className="size-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-3xl font-semibold tabular-nums">
            {unavailable ? "—" : value}
          </p>
          {percent !== undefined && !unavailable && <UsageBar percent={percent} />}
          <p className="truncate text-xs text-muted-foreground">
            {unavailable ? "Not available on this machine" : sub}
          </p>
        </CardContent>
      </Card>
    </NavLink>
  );
}

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

// 轮询 /health 探活：它是纯存活检查（不查采集缓存），响应快，
// 5s 一次足够及时发现后端挂掉；retry: 0 让失败立刻反映为离线，
// 而不是等 react-query 默认的 3 次重试拖十几秒。
export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => api.get<{ status: string }>("/health"),
    refetchInterval: 5_000,
    retry: 0,
  });
}

export function OnlineStatus() {
  const { isError, isPending } = useHealth();

  const online = !isPending && !isError;

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        className={cn(
          "size-2 rounded-full",
          online ? "bg-green-500" : "bg-red-500",
        )}
      />
      {isPending ? "Connecting…" : online ? "Online" : "Offline"}
    </div>
  );
}

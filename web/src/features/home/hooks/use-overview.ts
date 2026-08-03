import { useQuery } from "@tanstack/react-query";

import { fetchOverview } from "../api/overview-api";

// 全量快照接口只是读缓存（src/state.rs），开销和单指标接口一样小；
// 各采集器节奏不一（1s~5s），折中取 2s 轮询。
export function useOverview() {
  return useQuery({
    queryKey: ["metrics", "overview"],
    queryFn: fetchOverview,
    refetchInterval: 2000,
  });
}

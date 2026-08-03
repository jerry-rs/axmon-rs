import { useQuery } from "@tanstack/react-query";

import { fetchProcessMetric } from "../api/process-api";

// 后端 process 采集循环 2s 一轮（src/config.rs，全量扫 /proc 成本高），
// 前端同节奏。
export function useProcessMetric() {
  return useQuery({
    queryKey: ["metrics", "process"],
    queryFn: fetchProcessMetric,
    refetchInterval: 2000,
  });
}

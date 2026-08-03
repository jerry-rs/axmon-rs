import { useQuery } from "@tanstack/react-query";

import { fetchCpuMetric } from "../api/cpu-api";

// 后端 cpu 采集循环 1s 一轮（src/config.rs），前端按同节奏轮询。
// 之后再慢了也只是拿到"稍旧一点"的缓存，接口本身永远立即返回。
export function useCpuMetric() {
  return useQuery({
    queryKey: ["metrics", "cpu"],
    queryFn: fetchCpuMetric,
    refetchInterval: 1000,
  });
}

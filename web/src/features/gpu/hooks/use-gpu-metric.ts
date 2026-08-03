import { useQuery } from "@tanstack/react-query";

import { fetchGpuMetric } from "../api/gpu-api";

// 后端 gpu 采集循环 2s 一轮（src/config.rs），前端同节奏。
export function useGpuMetric() {
  return useQuery({
    queryKey: ["metrics", "gpu"],
    queryFn: fetchGpuMetric,
    refetchInterval: 2000,
  });
}

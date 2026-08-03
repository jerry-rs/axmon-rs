import { useQuery } from "@tanstack/react-query";

import { fetchMemMetric } from "../api/mem-api";

// 后端 mem 采集循环 1s 一轮（src/config.rs），前端按同节奏轮询。
export function useMemMetric() {
  return useQuery({
    queryKey: ["metrics", "mem"],
    queryFn: fetchMemMetric,
    refetchInterval: 1000,
  });
}

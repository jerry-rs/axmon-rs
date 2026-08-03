import { useQuery } from "@tanstack/react-query";

import { fetchDockerMetric } from "../api/docker-api";

// 后端 docker 采集循环 10s 一轮（src/config.rs），前端同节奏——
// 镜像/容器变化慢，且带 size 统计的列表调用很重。
// 注意：staleTime 不会主动发请求，页面实时性靠 refetchInterval 轮询。
export function useDockerMetric() {
  return useQuery({
    queryKey: ["metrics", "docker"],
    queryFn: fetchDockerMetric,
    staleTime: 0,
  });
}

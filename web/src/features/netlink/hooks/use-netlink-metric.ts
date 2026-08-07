import { useQuery } from "@tanstack/react-query";

import { fetchNetLinkMetric } from "../api/netlink-api";

// 后端 netlink 采集循环 2s 一轮（src/config.rs），前端同节奏。
export function useNetLinkMetric() {
  return useQuery({
    queryKey: ["metrics", "netlink"],
    queryFn: fetchNetLinkMetric,
    refetchInterval: 2000,
  });
}

import { useQuery } from "@tanstack/react-query";

import { fetchDiskMetric } from "../api/disk-api";

// 后端 disk 采集循环 5s 一轮（src/config.rs，磁盘变化慢），前端同节奏。
export function useDiskMetric() {
  return useQuery({
    queryKey: ["metrics", "disk"],
    queryFn: fetchDiskMetric,
    refetchInterval: 5000,
  });
}

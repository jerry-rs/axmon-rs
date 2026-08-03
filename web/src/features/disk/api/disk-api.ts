import { api } from "@/lib/api-client";

// 对应后端 collectors/disk.rs 的 DiskMetric / DiskInfo。外层 Timestamped
// 信封经 serde flatten 平铺进同一层 JSON（见 scheduler.rs），camelCase。
export interface DiskInfo {
  name: string;
  mountPoint: string;
  fileSystem: string;
  totalBytes: number;
  /** 已扣除 ext4 之类的 root 保留块，df 的 Avail 口径。 */
  availableBytes: number;
  /** (total - available) / total，即 df 里 Use% 的口径；
   *  total 为 0 的虚拟文件系统恒为 0。 */
  usagePercent: number;
}

export interface DiskMetric {
  /** 这份数据什么时候采到的；0 是哨兵：后端还没采到首轮。 */
  collectedAtUnixMs: number;
  disks: DiskInfo[];
}

export function fetchDiskMetric(): Promise<DiskMetric> {
  return api.get<DiskMetric>("/metrics/disk");
}

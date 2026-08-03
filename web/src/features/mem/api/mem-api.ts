import { api } from "@/lib/api-client";

// 对应后端 collectors/mem.rs 的 MemMetric。外层 Timestamped 信封经
// serde flatten 平铺进同一层 JSON（见 scheduler.rs），字段全部 camelCase。
export interface MemMetric {
  /** 这份数据什么时候采到的；0 是哨兵：后端还没采到首轮。 */
  collectedAtUnixMs: number;
  totalBytes: number;
  usedBytes: number;
  /** "含可回收缓存"口径的空闲量，与 usagePercent 的 used/total 口径
   *  分歧主要在 Linux page cache。 */
  availableBytes: number;
  /** usedBytes / totalBytes，后端预计算好的告警/仪表盘口径。 */
  usagePercent: number;
  swapTotalBytes: number;
  swapUsedBytes: number;
  swapFreeBytes: number;
  /** 没配置 swap 的机器（swapTotal = 0）恒为 0，不会是 NaN。 */
  swapUsagePercent: number;
}

export function fetchMemMetric(): Promise<MemMetric> {
  return api.get<MemMetric>("/metrics/mem");
}

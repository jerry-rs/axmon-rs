import { api } from "@/lib/api-client";

// 对应后端 collectors/cpu.rs 的 CpuMetric。外层 Timestamped 信封经
// serde flatten 平铺进同一层 JSON（见 scheduler.rs），字段全部 camelCase。
export interface CpuMetric {
  /** 这份数据什么时候采到的（不是响应生成时间）；0 是哨兵：后端还没采到首轮。 */
  collectedAtUnixMs: number;
  /** 整机使用率 0-100（/proc/stat 聚合行口径，不是每核算术平均）。 */
  globalUsagePercent: number;
  perCoreUsagePercent: number[];
  /** 1/5/15 分钟 load average；Windows 上恒为 0。 */
  loadAvg1: number;
  loadAvg5: number;
  loadAvg15: number;
}

export function fetchCpuMetric(): Promise<CpuMetric> {
  return api.get<CpuMetric>("/metrics/cpu");
}

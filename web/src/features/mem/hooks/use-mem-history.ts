import { useEffect, useState } from "react";

import { useMemMetric } from "./use-mem-metric";

export interface MemUsageSample {
  /** 用 collectedAtUnixMs 去重：后端采集失败保留旧缓存时时间戳也是旧的，
   *  曲线不会原地踏步画出假"新"点。 */
  collectedAtUnixMs: number;
  time: string;
  /** 物理内存使用率（0-100）。 */
  usage: number;
  /** swap 使用率（0-100），未配置 swap 的机器恒为 0。 */
  swapUsage: number;
}

/** 1s 一个点，保留最近 60 秒。 */
const HISTORY_SIZE = 60;

/**
 * 后端只有"当前值"没有时序（README 里历史曲线是 TODO），
 * 所以在前端按轮询节奏攒一个滚动窗口；只覆盖页面打开后的这一分钟，
 * 刷新页面即清空。与 cpu 的 use-cpu-history 是同构的刻意重复——
 * feature 之间保持自包含，不互相 import。
 */
export function useMemHistory() {
  const query = useMemMetric();
  const [history, setHistory] = useState<MemUsageSample[]>([]);

  useEffect(() => {
    const data = query.data;
    if (!data || data.collectedAtUnixMs === 0) return;

    setHistory((prev) => {
      if (prev.some((s) => s.collectedAtUnixMs === data.collectedAtUnixMs)) {
        return prev;
      }
      const next: MemUsageSample = {
        collectedAtUnixMs: data.collectedAtUnixMs,
        time: new Date(data.collectedAtUnixMs).toLocaleTimeString(),
        usage: data.usagePercent,
        swapUsage: data.swapUsagePercent,
      };
      return [...prev, next].slice(-HISTORY_SIZE);
    });
  }, [query.data]);

  return { ...query, history };
}

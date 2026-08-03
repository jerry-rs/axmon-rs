import { useEffect, useState } from "react";

import { useCpuMetric } from "./use-cpu-metric";

export interface CpuUsageSample {
  /** 用 collectedAtUnixMs 而不是收到响应的时间：后端采集失败保留旧缓存时，
   * 时间戳也是旧的，靠它去重，曲线不会原地踏步画出一串假"新"点。 */
  collectedAtUnixMs: number;
  /** X 轴标签（HH:MM:SS）。 */
  time: string;
  usage: number;
}

/** 1s 一个点，保留最近 60 秒。 */
const HISTORY_SIZE = 60;

/**
 * 后端只有"当前值"没有时序（README 里历史曲线是 TODO），
 * 所以在前端按轮询节奏攒一个滚动窗口；只覆盖页面打开后的这一分钟，
 * 刷新页面即清空。
 */
export function useCpuHistory() {
  const query = useCpuMetric();
  const [history, setHistory] = useState<CpuUsageSample[]>([]);

  useEffect(() => {
    const data = query.data;
    if (!data || data.collectedAtUnixMs === 0) return;

    setHistory((prev) => {
      if (prev.some((s) => s.collectedAtUnixMs === data.collectedAtUnixMs)) {
        return prev;
      }
      const next: CpuUsageSample = {
        collectedAtUnixMs: data.collectedAtUnixMs,
        time: new Date(data.collectedAtUnixMs).toLocaleTimeString(),
        usage: data.globalUsagePercent,
      };
      return [...prev, next].slice(-HISTORY_SIZE);
    });
  }, [query.data]);

  return { ...query, history };
}

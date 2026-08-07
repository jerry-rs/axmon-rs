import { useEffect, useState } from "react";

import type { UsageTrendPoint } from "@/components/usage-trend-chart";

import { useGpuMetric } from "./use-gpu-metric";

interface GpuSample extends UsageTrendPoint {
  /** 用 collectedAtUnixMs 而不是收到响应的时间：后端采集失败保留旧缓存时，
   * 时间戳也是旧的，靠它去重，曲线不会原地踏步画出一串假"新"点。 */
  collectedAtUnixMs: number;
}

/** 2s 一个点，保留最近 60 点 ≈ 2 分钟。 */
const HISTORY_SIZE = 60;

/**
 * 后端只有"当前值"没有时序，所以在前端按轮询节奏攒滚动窗口；
 * 按 GPU index 分开记，多卡时各自一条曲线；只覆盖页面打开后的窗口，
 * 刷新页面即清空。
 */
export function useGpuHistory() {
  const query = useGpuMetric();
  const [histories, setHistories] = useState<Record<number, GpuSample[]>>({});

  useEffect(() => {
    const data = query.data;
    if (!data || data.collectedAtUnixMs === 0) return;

    setHistories((prev) => {
      // 这一轮整批去重：后端保留旧缓存时所有卡的时间戳都是旧的。
      const first = data.gpus[0]?.index;
      if (
        first !== undefined &&
        prev[first]?.some((s) => s.collectedAtUnixMs === data.collectedAtUnixMs)
      ) {
        return prev;
      }
      const next = { ...prev };
      for (const gpu of data.gpus) {
        if (!gpu.healthy) continue;
        const sample: GpuSample = {
          collectedAtUnixMs: data.collectedAtUnixMs,
          usage: gpu.utilizationPercent,
        };
        next[gpu.index] = [...(next[gpu.index] ?? []), sample].slice(-HISTORY_SIZE);
      }
      return next;
    });
  }, [query.data]);

  return { ...query, histories };
}

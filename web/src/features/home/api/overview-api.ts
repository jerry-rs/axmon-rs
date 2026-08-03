import { api } from "@/lib/api-client";

// 对应后端 state.rs 的 FullSnapshot（/api/v1/metrics）。
// 这里只声明概览页真正读到的字段，完整类型在各自 feature 的 api 文件里；
// 刻意不跨 feature import——home 只依赖后端 JSON 形状，不依赖其他 feature
// 的内部定义，单边演进互不影响。
export interface OverviewSnapshot {
  cpu: {
    collectedAtUnixMs: number;
    globalUsagePercent: number;
    perCoreUsagePercent: number[];
  };
  mem: {
    collectedAtUnixMs: number;
    usagePercent: number;
    usedBytes: number;
    totalBytes: number;
  };
  disk: {
    collectedAtUnixMs: number;
    disks: { mountPoint: string; usagePercent: number }[];
  };
  docker: {
    available: boolean;
    images: unknown[];
    containers: { state: string }[];
  };
  gpu: {
    available: boolean;
    gpus: { healthy: boolean; utilizationPercent: number }[];
  };
  process: {
    collectedAtUnixMs: number;
    processCount: number;
  };
}

export function fetchOverview(): Promise<OverviewSnapshot> {
  return api.get<OverviewSnapshot>("/metrics");
}

import { api } from "@/lib/api-client";

// 对应后端 collectors/gpu.rs 的 GpuMetric / GpuInfo / GpuProcessInfo。
// 外层 Timestamped 信封经 serde flatten 平铺（见 scheduler.rs），camelCase。
export interface GpuProcessInfo {
  pid: number;
  /** 进程名；NVML 枚举到 sysinfo 解析之间进程退出时为空字符串。 */
  name: string;
  /** 该进程占用的 GPU 显存（VRAM）；驱动不报告（Windows WDDM）时是 null，不是 0。 */
  gpuMemBytes: number | null;
  /** CPU 利用率（100 = 一个核，多线程可超 100），按采集轮次差分。 */
  cpuPercent: number;
  /** 主机侧（CPU）物理内存（RSS），跟 gpuMemBytes 对称。 */
  cpuMemBytes: number;
  /** 主机侧（CPU）虚拟内存（VSZ）。 */
  cpuVirtualMemBytes: number;
}

export interface GpuInfo {
  index: number;
  name: string;
  /** 核心利用率 0-100，nvidia-smi "GPU-Util" 一栏。 */
  utilizationPercent: number;
  memUsedBytes: number;
  memTotalBytes: number;
  /** memUsed / memTotal，nvidia-smi "Memory-Usage" 的百分比口径。 */
  memUsagePercent: number;
  temperatureC: number;
  /** 这张卡上的 compute 进程，按显存占用降序。 */
  processes: GpuProcessInfo[];
  /** false 时整条其他字段都是默认值，以 error 为准。 */
  healthy: boolean;
  error: string | null;
}

export interface GpuMetric {
  collectedAtUnixMs: number;
  gpus: GpuInfo[];
  /** 没有 NVIDIA 驱动 / NVML 初始化失败时是 false——功能不可用，不是错误。 */
  available: boolean;
}

export function fetchGpuMetric(): Promise<GpuMetric> {
  return api.get<GpuMetric>("/metrics/gpu");
}

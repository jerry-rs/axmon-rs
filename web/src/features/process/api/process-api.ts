import { api } from "@/lib/api-client";

// 对应后端 collectors/process.rs 的 ProcessMetric / ProcessInfo。
// 外层 Timestamped 信封经 serde flatten 平铺（见 scheduler.rs），camelCase。
export interface ProcessInfo {
  pid: number;
  /** init / 内核线程没有父进程时为 null。 */
  ppid: number | null;
  name: string;
  /** UID 查不到用户名时为空字符串。 */
  user: string;
  /** 完整命令行；内核线程、权限不足时为空字符串。 */
  cmd: string;
  /** 100% = 占满一个核，多线程进程可以超过 100%。 */
  cpuPercent: number;
  /** RSS，实际占用的物理内存。 */
  memBytes: number;
  /** 虚拟地址空间（VSZ），通常远大于 RSS，不参与排序。 */
  virtualMemBytes: number;
}

export interface ProcessMetric {
  /** 这份数据什么时候采到的；0 是哨兵：后端还没采到首轮。 */
  collectedAtUnixMs: number;
  processCount: number;
  topByCpu: ProcessInfo[];
  topByMem: ProcessInfo[];
}

export function fetchProcessMetric(): Promise<ProcessMetric> {
  return api.get<ProcessMetric>("/metrics/process");
}

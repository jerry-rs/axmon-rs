export interface GpuProcess {
  pid: number
  usedGpuMemory: number
  totalGpuMemory: number
  user: string
  cpuUsage: number
  cpuMem: number
  cpuVmem: number
  runTime: number
  command: string
}

export interface GpuCore {
  index: number
  name: string
  brand: string
  architecture: string
  busId: string
  util: number
  mUtil: number
  temperature: number
  processes: GpuProcess[]
}

export interface GpuStreamEvent {
  timestamp: number
  gpus: GpuCore[]
}

export interface GpuVersion {
  driverVersion: string
  nvmlVersion: string
  cudaVersion: string
}

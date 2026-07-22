export interface CpuUsage {
  usagePercent: number
}

export interface CpuCore {
  usage: number
  name: string
  vendorId: string
  brand: string
  frequency: number
}

export interface CpuStreamEvent {
  timestamp: number
  cpuUsage: number
  one: number
  five: number
  fifteen: number
  cpus: CpuCore[]
}

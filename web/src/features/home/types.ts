export interface HomeStreamEvent {
  longOsVersion: string
  kernelLongVersion: string
  cpuUsage: number
  memUsage: number
  diskMountPoint: string
  diskMaxUsage: number
  processCount: number
  gpuMaxUtilUsage: number
  gpuMaxMemUsage: number
  gpuMaxTemperature: number
  dockerImageTotalCount: number
  dockerImageRunningCount: number
  dockerContainerTotalCount: number
  dockerContainerRunningCount: number
}

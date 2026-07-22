export interface DiskItem {
  name: string
  fileSystem: string
  mountPoint: string
  availableSpace: number
  usedSpace: number
  totalSpace: number
  diskUsage: number
}

export interface DiskInfo {
  timestamp: number
  disks: DiskItem[]
}

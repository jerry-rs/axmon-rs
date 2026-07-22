export interface MemUsage {
  total_bytes: number
  used_bytes: number
  usage_percent: number
}

export interface MemStreamEvent {
  timestamp: number
  memUsage: number
  availableMemory: number
  freeMemory: number
  usedMemory: number
  totalMemory: number
}

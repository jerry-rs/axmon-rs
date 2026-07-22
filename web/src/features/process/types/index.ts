export interface Process {
  pid: number
  ppid: number | null
  user: string
  cpuUsage: number
  memory: number
  virtualMemory: number
  status: string
  cmd: string
  command: string
}

export interface ProcessStreamEvent {
  timestamp: number
  processes: Process[]
}

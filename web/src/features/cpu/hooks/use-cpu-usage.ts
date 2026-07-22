import { useQuery } from '@tanstack/react-query'
import { cpuUsageQueryOptions } from '../api'

export function useCpuUsage() {
  return useQuery(cpuUsageQueryOptions)
}
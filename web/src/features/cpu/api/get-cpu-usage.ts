import { queryOptions } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { CpuUsage } from '../types'

async function fetchCpuUsage(): Promise<CpuUsage> {
  return apiClient<CpuUsage>('/v1/cpu/usage')
}

export const cpuUsageQueryOptions = queryOptions({
  queryKey: ['cpu', 'usage'],
  queryFn: fetchCpuUsage,
})
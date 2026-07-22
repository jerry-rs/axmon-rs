import { queryOptions } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { DiskInfo } from '../types'

async function fetchDiskInfo(): Promise<DiskInfo> {
  return apiClient<DiskInfo>('/v1/disk/info')
}

export const diskInfoQueryOptions = queryOptions({
  queryKey: ['disk', 'info'],
  queryFn: fetchDiskInfo,
})

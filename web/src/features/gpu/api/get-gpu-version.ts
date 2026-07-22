import { queryOptions } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { GpuVersion } from '../types'

async function fetchGpuVersion(): Promise<GpuVersion> {
  return apiClient<GpuVersion>('/v1/gpu/version')
}

export const gpuVersionQueryOptions = queryOptions({
  queryKey: ['gpu', 'version'],
  queryFn: fetchGpuVersion,
})

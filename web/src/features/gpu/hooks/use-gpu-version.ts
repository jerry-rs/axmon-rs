import { useQuery } from '@tanstack/react-query'
import { gpuVersionQueryOptions } from '../api'

export function useGpuVersion() {
  return useQuery(gpuVersionQueryOptions)
}

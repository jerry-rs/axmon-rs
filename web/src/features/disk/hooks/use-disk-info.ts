import { useQuery } from '@tanstack/react-query'
import { diskInfoQueryOptions } from '../api'

export function useDiskInfo() {
  return useQuery(diskInfoQueryOptions)
}

import { useQuery } from '@tanstack/react-query'
import { dockerContainersQueryOptions } from '../api'

export function useDockerContainers() {
  return useQuery(dockerContainersQueryOptions)
}
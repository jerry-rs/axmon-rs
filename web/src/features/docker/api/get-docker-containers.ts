import { queryOptions } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { DockerContainers } from '../types'

async function fetchDockerContainers(): Promise<DockerContainers> {
  return apiClient<DockerContainers>('/v1/docker/containers')
}

export const dockerContainersQueryOptions = queryOptions({
  queryKey: ['docker', 'containers'],
  queryFn: fetchDockerContainers,
})

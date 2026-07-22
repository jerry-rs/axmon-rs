import { queryOptions } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { DockerImages } from '../types'

async function fetchDockerImages(): Promise<DockerImages> {
  return apiClient<DockerImages>('/v1/docker/images')
}

export const dockerImagesQueryOptions = queryOptions({
  queryKey: ['docker', 'images'],
  queryFn: fetchDockerImages,
})

import { useQuery } from '@tanstack/react-query'
import { dockerImagesQueryOptions } from '../api'

export function useDockerImages() {
  return useQuery(dockerImagesQueryOptions)
}
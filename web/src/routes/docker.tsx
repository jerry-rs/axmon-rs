import { createFileRoute } from '@tanstack/react-router'
import { DockerPage } from '@/features/docker/pages/docker-page'

export const Route = createFileRoute('/docker')({
  component: () => <DockerPage />,
})
import { createFileRoute } from '@tanstack/react-router'
import { GpuPage } from '@/features/gpu/pages/gpu-page'

export const Route = createFileRoute('/gpu')({
  component: () => <GpuPage />,
})

import { createFileRoute } from '@tanstack/react-router'
import { CpuPage } from '@/features/cpu/pages/cpu-page'

export const Route = createFileRoute('/cpu')({
  component: () => <CpuPage />,
})
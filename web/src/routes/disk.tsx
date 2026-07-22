import { createFileRoute } from '@tanstack/react-router'
import { DiskPage } from '@/features/disk/pages/disk-page'

export const Route = createFileRoute('/disk')({
  component: () => <DiskPage />,
})
import { createFileRoute } from '@tanstack/react-router'
import { MemPage } from '@/features/mem/pages/mem-page'

export const Route = createFileRoute('/mem')({
  component: () => <MemPage />,
})
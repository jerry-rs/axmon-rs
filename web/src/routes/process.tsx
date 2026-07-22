import { createFileRoute } from '@tanstack/react-router'
import { ProcessPage } from '@/features/process/pages/process-page'

export const Route = createFileRoute('/process')({
  component: () => <ProcessPage />,
})

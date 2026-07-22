import { useEffect, useState } from 'react'
import { createEventStream } from '@/lib/sse-client'
import type { CpuStreamEvent } from '../types'

const CPU_STREAM_URL = '/api/v1/cpu/stream'

export function useCpuStream() {
  const [events, setEvents] = useState<CpuStreamEvent[]>([])
  const [latest, setLatest] = useState<CpuStreamEvent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    createEventStream<CpuStreamEvent>({
      url: CPU_STREAM_URL,
      onEvent: (data) => {
        setIsLoading(false)
        setLatest(data)
        setError(null)
        setEvents((prev) => {
          const next = [...prev, data]
          return next.length > 60 ? next.slice(-60) : next
        })
      },
      onError: () => {
        setIsLoading(false)
        setError('Failed to connect to CPU stream')
      },
      signal: controller.signal,
    })

    return () => {
      controller.abort()
    }
  }, [])

  return { events, latest, error, isLoading }
}

import { useEffect, useState } from 'react'
import { createEventStream } from '@/lib/sse-client'
import type { GpuStreamEvent } from '../types'

const GPU_STREAM_URL = '/api/v1/gpu/stream'

export function useGpuStream() {
  const [events, setEvents] = useState<GpuStreamEvent[]>([])
  const [latest, setLatest] = useState<GpuStreamEvent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    createEventStream<GpuStreamEvent>({
      url: GPU_STREAM_URL,
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
        setError('Failed to connect to GPU stream')
      },
      signal: controller.signal,
    })

    return () => {
      controller.abort()
    }
  }, [])

  return { events, latest, error, isLoading }
}

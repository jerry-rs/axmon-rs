import { useEffect, useState } from 'react'
import { createEventStream } from '@/lib/sse-client'
import type { MemStreamEvent } from '../types'

const MEM_STREAM_URL = '/api/v1/mem/stream'

export function useMemStream() {
  const [events, setEvents] = useState<MemStreamEvent[]>([])
  const [latest, setLatest] = useState<MemStreamEvent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    createEventStream<MemStreamEvent>({
      url: MEM_STREAM_URL,
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
        setError('Failed to connect to memory stream')
      },
      signal: controller.signal,
    })

    return () => {
      controller.abort()
    }
  }, [])

  return { events, latest, error, isLoading }
}

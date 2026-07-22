import { useEffect, useState } from 'react'
import { createEventStream } from '@/lib/sse-client'
import type { ProcessStreamEvent } from '../types'

const PROCESS_STREAM_URL = '/api/v1/process/stream'

export function useProcessStream() {
  const [events, setEvents] = useState<ProcessStreamEvent[]>([])
  const [latest, setLatest] = useState<ProcessStreamEvent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    createEventStream<ProcessStreamEvent>({
      url: PROCESS_STREAM_URL,
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
        setError('Failed to connect to process stream')
      },
      signal: controller.signal,
    })

    return () => {
      controller.abort()
    }
  }, [])

  return { events, latest, error, isLoading }
}

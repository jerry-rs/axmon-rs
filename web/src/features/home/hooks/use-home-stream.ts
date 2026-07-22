import { useEffect, useState } from 'react'
import { createEventStream } from '@/lib/sse-client'
import type { HomeStreamEvent } from '../types'

const HOME_STREAM_URL = '/api/v1/home/stream'

export function useHomeStream() {
  const [events, setEvents] = useState<HomeStreamEvent[]>([])
  const [latest, setLatest] = useState<HomeStreamEvent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    createEventStream<HomeStreamEvent>({
      url: HOME_STREAM_URL,
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
        setError('Failed to connect to home stream')
      },
      signal: controller.signal,
    })

    return () => {
      controller.abort()
    }
  }, [])

  return { events, latest, error, isLoading }
}

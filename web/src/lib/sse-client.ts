import { fetchEventSource } from '@microsoft/fetch-event-source'

interface EventStreamOptions<T> {
  url: string
  onEvent: (data: T) => void
  onError?: (error: Error) => void
  signal?: AbortSignal
}

const AUTH_TOKEN = 'AXMON_TOKEN'

export function createEventStream<T>(options: EventStreamOptions<T>): void {
  fetchEventSource(options.url, {
    signal: options.signal,
    openWhenHidden: true,
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
    },
    onmessage(event) {
      try {
        const data = JSON.parse(event.data) as T
        options.onEvent(data)
      } catch {
        // ignore unparseable events
      }
    },
    onerror(err) {
      options.onError?.(err instanceof Error ? err : new Error(String(err)))
      throw err
    },
  })
}

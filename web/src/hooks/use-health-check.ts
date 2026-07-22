import { useEffect, useRef } from 'react'
import { setConnectionStatus } from '@/lib/connection-status'

const HEALTH_URL = '/api/health'
const INTERVAL_MS = 5_000

export function useHealthCheck() {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch(HEALTH_URL)
        setConnectionStatus(res.ok)
      } catch {
        setConnectionStatus(false)
      }
    }

    // Initial check
    check()

    // Poll
    timerRef.current = setInterval(check, INTERVAL_MS)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      setConnectionStatus(false)
    }
  }, [])
}
import { useSyncExternalStore } from 'react'

let connected = false
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((l) => l())
}

export function setConnectionStatus(value: boolean) {
  connected = value
  notify()
}

export function useConnectionStatus() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => {
        listeners.delete(cb)
      }
    },
    () => connected,
  )
}
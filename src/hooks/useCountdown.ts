// src/hooks/useCountdown.ts
import { useState, useRef, useCallback } from 'react'

export function useCountdown() {
  const [seconds, setSeconds] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const start = useCallback((from: number, onComplete?: () => void) => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setSeconds(from)
    let remaining = from
    intervalRef.current = setInterval(() => {
      remaining -= 1
      if (remaining <= 0) {
        clearInterval(intervalRef.current!)
        setSeconds(0)
        onComplete?.()
      } else {
        setSeconds(remaining)
      }
    }, 1000)
  }, [])

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setSeconds(0)
  }, [])

  return { seconds, start, reset }
}

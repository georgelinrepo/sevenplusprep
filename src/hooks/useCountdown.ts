// src/hooks/useCountdown.ts
import { useState, useRef } from 'react'

export function useCountdown() {
  const [seconds, setSeconds] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function start(from: number, onComplete?: () => void) {
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
  }

  function reset() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setSeconds(0)
  }

  return { seconds, start, reset }
}

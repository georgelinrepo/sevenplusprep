// src/hooks/useCountdown.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCountdown } from './useCountdown'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useCountdown', () => {
  it('starts at the given seconds', () => {
    const { result } = renderHook(() => useCountdown())
    act(() => result.current.start(15))
    expect(result.current.seconds).toBe(15)
  })

  it('counts down each second', () => {
    const { result } = renderHook(() => useCountdown())
    act(() => result.current.start(15))
    act(() => vi.advanceTimersByTime(3000))
    expect(result.current.seconds).toBe(12)
  })

  it('calls onComplete when reaching 0', () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() => useCountdown())
    act(() => result.current.start(3, onComplete))
    act(() => vi.advanceTimersByTime(3000))
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(result.current.seconds).toBe(0)
  })

  it('does not go below 0', () => {
    const { result } = renderHook(() => useCountdown())
    act(() => result.current.start(2))
    act(() => vi.advanceTimersByTime(5000))
    expect(result.current.seconds).toBe(0)
  })
})

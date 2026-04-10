// src/hooks/useTTS.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTTS } from './useTTS'

const mockSpeak = vi.fn()
const mockCancel = vi.fn()

beforeEach(() => {
  mockSpeak.mockClear()
  mockCancel.mockClear()
  Object.defineProperty(window, 'speechSynthesis', {
    value: { speak: mockSpeak, cancel: mockCancel, speaking: false },
    writable: true,
  })
  global.SpeechSynthesisUtterance = vi.fn().mockImplementation((text) => ({ text })) as any
})

describe('useTTS', () => {
  it('calls speechSynthesis.speak with the text', () => {
    const { result } = renderHook(() => useTTS())
    act(() => result.current.speak('Hello world'))
    expect(mockSpeak).toHaveBeenCalledTimes(1)
  })

  it('calls speechSynthesis.cancel on stop', () => {
    const { result } = renderHook(() => useTTS())
    act(() => result.current.stop())
    expect(mockCancel).toHaveBeenCalledTimes(1)
  })
})

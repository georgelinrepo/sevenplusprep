// src/hooks/useTTS.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTTS } from './useTTS'

vi.mock('../api/functions', () => ({
  generateAudio: vi.fn().mockResolvedValue('blob:mock-url'),
}))

const mockPause = vi.fn()
const mockPlay = vi.fn().mockResolvedValue(undefined)

beforeEach(() => {
  mockPause.mockClear()
  mockPlay.mockClear()
  global.Audio = vi.fn().mockImplementation(() => ({
    play: mockPlay,
    pause: mockPause,
    onended: null,
    src: 'blob:mock-url',
  })) as any
  global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url')
  global.URL.revokeObjectURL = vi.fn()
})

describe('useTTS', () => {
  it('calls generateAudio and plays audio on speak', async () => {
    const { result } = renderHook(() => useTTS())
    await act(() => result.current.speak('Hello world'))
    expect(mockPlay).toHaveBeenCalledTimes(1)
  })

  it('pauses audio on stop', async () => {
    const { result } = renderHook(() => useTTS())
    await act(() => result.current.speak('Hello world'))
    act(() => result.current.stop())
    expect(mockPause).toHaveBeenCalledTimes(1)
  })
})

// src/api/functions.test.ts
import { describe, it, expect, vi } from 'vitest'

// Mock firebase/functions
vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() => vi.fn()),
  getFunctions: vi.fn(),
}))

vi.mock('../firebase', () => ({
  fns: {},
}))

describe('functions api', () => {
  it('exports generateSentences, markAnswer, generateAudio, generateMathsQuestions, markMathsSession, generateVerbalQuestions', async () => {
    const mod = await import('./functions')
    expect(typeof mod.generateSentences).toBe('function')
    expect(typeof mod.markAnswer).toBe('function')
    expect(typeof mod.generateAudio).toBe('function')
    expect(typeof mod.generateMathsQuestions).toBe('function')
    expect(typeof mod.markMathsSession).toBe('function')
    expect(typeof mod.generateVerbalQuestions).toBe('function')
  })
})

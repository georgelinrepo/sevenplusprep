// src/api/children.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { evaluateProgression } from './children'
import type { Child, Level } from '../types'

describe('evaluateProgression', () => {
  const baseChild: Child = {
    id: 'test',
    name: 'James',
    createdAt: new Date().toISOString(),
    level: 'Beginner',
    consecutiveHighScores: 0,
    consecutiveLowScores: 0,
    mathsLevel: 'Beginner',
    mathsConsecutiveHighScores: 0,
    mathsConsecutiveLowScores: 0,
  }

  it('levels up after 3 consecutive high scores', () => {
    const child = { ...baseChild, consecutiveHighScores: 3 }
    const result = evaluateProgression(child, 85)
    expect(result.level).toBe('Developing')
    expect(result.consecutiveHighScores).toBe(0)
    expect(result.consecutiveLowScores).toBe(0)
  })

  it('levels down after 3 consecutive low scores', () => {
    const child = { ...baseChild, level: 'Developing', consecutiveLowScores: 3 }
    const result = evaluateProgression(child, 40)
    expect(result.level).toBe('Beginner')
    expect(result.consecutiveLowScores).toBe(0)
    expect(result.consecutiveHighScores).toBe(0)
  })

  it('does not level below Beginner', () => {
    const child = { ...baseChild, level: 'Beginner', consecutiveLowScores: 3 }
    const result = evaluateProgression(child, 40)
    expect(result.level).toBe('Beginner')
  })

  it('does not level above Stretch', () => {
    const child = { ...baseChild, level: 'Stretch', consecutiveHighScores: 3 }
    const result = evaluateProgression(child, 90)
    expect(result.level).toBe('Stretch')
  })

  it('increments high score counter on good session', () => {
    const result = evaluateProgression(baseChild, 82)
    expect(result.consecutiveHighScores).toBe(1)
    expect(result.consecutiveLowScores).toBe(0)
  })

  it('increments low score counter on poor session', () => {
    const result = evaluateProgression(baseChild, 45)
    expect(result.consecutiveLowScores).toBe(1)
    expect(result.consecutiveHighScores).toBe(0)
  })

  it('resets both counters on middle score', () => {
    const child = { ...baseChild, consecutiveHighScores: 2, consecutiveLowScores: 1 }
    const result = evaluateProgression(child, 65)
    expect(result.consecutiveHighScores).toBe(0)
    expect(result.consecutiveLowScores).toBe(0)
  })
})

describe('evaluateProgression — maths pseudo-child pattern', () => {
  it('levels up after 3 consecutive high scores via pseudo-child', () => {
    const pseudo = {
      level: 'Beginner' as Level,
      consecutiveHighScores: 3,
      consecutiveLowScores: 0,
    }
    const result = evaluateProgression(pseudo, 85)
    expect(result.level).toBe('Developing')
    expect(result.consecutiveHighScores).toBe(0)
  })

  it('increments counter on high score via pseudo-child', () => {
    const pseudo = {
      level: 'Beginner' as Level,
      consecutiveHighScores: 0,
      consecutiveLowScores: 0,
    }
    const result = evaluateProgression(pseudo, 85)
    expect(result.consecutiveHighScores).toBe(1)
    expect(result.level).toBe('Beginner')
  })
})

describe('evaluateProgression — verbal pseudo-child pattern', () => {
  it('levels up after 3 consecutive high scores via verbal pseudo-child', () => {
    const pseudo = {
      level: 'Beginner' as Level,
      consecutiveHighScores: 3,
      consecutiveLowScores: 0,
    }
    const result = evaluateProgression(pseudo, 85)
    expect(result.level).toBe('Developing')
    expect(result.consecutiveHighScores).toBe(0)
  })

  it('does not cross-contaminate verbal fields with maths fields', () => {
    const pseudo = {
      level: 'Confident' as Level,
      consecutiveHighScores: 0,
      consecutiveLowScores: 0,
    }
    const result = evaluateProgression(pseudo, 40)
    expect(result.consecutiveLowScores).toBe(1)
    expect(result.level).toBe('Confident')
  })
})

describe('children API exports', () => {
  it('exports saveMathsSession', async () => {
    const mod = await import('./children')
    expect(typeof mod.saveMathsSession).toBe('function')
  })

  it('exports getMathsSessions', async () => {
    const mod = await import('./children')
    expect(typeof mod.getMathsSessions).toBe('function')
  })

  it('exports deleteChild', async () => {
    const mod = await import('./children')
    expect(typeof mod.deleteChild).toBe('function')
  })
})

describe('children API verbal exports', () => {
  it('exports saveVerbalSession', async () => {
    const mod = await import('./children')
    expect(typeof mod.saveVerbalSession).toBe('function')
  })

  it('exports getVerbalSessions', async () => {
    const mod = await import('./children')
    expect(typeof mod.getVerbalSessions).toBe('function')
  })
})

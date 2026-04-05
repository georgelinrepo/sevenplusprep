// src/types.ts

export type Level = 'Beginner' | 'Developing' | 'Confident' | 'Stretch'

export type ErrorType = 'homophone' | 'punctuation' | 'contraction' | 'spelling'

export interface DictationError {
  type: ErrorType
  word: string        // what the child wrote
  correction: string  // what it should be
}

export interface SentenceResult {
  correct: string
  childAnswer: string
  score: number       // 0-100
  errors: DictationError[]
}

export interface Session {
  id: string
  date: string        // ISO timestamp
  level: Level
  totalScore: number  // 0-100
  sentences: SentenceResult[]
}

export interface Child {
  id: string
  name: string
  createdAt: string
  level: Level
  consecutiveHighScores: number
  consecutiveLowScores: number
}

export interface GeneratedSentence {
  text: string
}

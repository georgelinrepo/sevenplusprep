// src/types.ts

export type Level = 'Beginner' | 'Developing' | 'Confident' | 'Stretch'

export type ErrorType = 'homophone' | 'punctuation' | 'contraction' | 'spelling'

export type MathsCategory =
  | 'arithmetic'
  | 'tables'
  | 'fractions'
  | 'money'
  | 'time'
  | 'word_problem'
  | 'sequence'
  | 'measures'
  | 'shape'
  | 'reasoning'

export interface DictationError {
  type: ErrorType
  word: string
  correction: string
}

export interface SentenceResult {
  correct: string
  childAnswer: string
  score: number       // 0-100
  errors: DictationError[]
}

export interface Session {
  id: string
  date: string         // ISO timestamp
  level: Level
  totalScore: number   // 0-100
  sentences: SentenceResult[]
}

export interface MathsQuestion {
  question: string    // phrased as read aloud: "What is six times four?"
  expected: string    // always includes units where applicable: "24", "45p", "8 cm", "3:15"
  category: MathsCategory
}

export interface MathsQuestionResult {
  question: string
  expected: string
  childAnswer: string
  correct: boolean
  feedback: string
  category: MathsCategory
}

export interface MathsSession {
  id: string
  date: string         // ISO timestamp
  level: Level
  totalScore: number   // 0–100 (percentage of 15 correct, rounded)
  questions: MathsQuestionResult[]
}

export interface Child {
  id: string
  name: string
  createdAt: string
  level: Level
  consecutiveHighScores: number
  consecutiveLowScores: number
  mathsLevel: Level
  mathsConsecutiveHighScores: number
  mathsConsecutiveLowScores: number
}

export interface GeneratedSentence {
  text: string
}

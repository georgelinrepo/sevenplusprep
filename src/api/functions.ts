// src/api/functions.ts
import { httpsCallable } from 'firebase/functions'
import { fns } from '../firebase'
import type { Level, DictationError, MathsQuestion, MathsQuestionResult, VerbalQuestion } from '../types'

const _generateSentences = httpsCallable<{ level: Level }, { sentences: string[] }>(
  fns, 'generateSentences'
)

const _generateAudio = httpsCallable<{ text: string }, { audio: string }>(
  fns, 'generateAudio'
)

const _markAnswer = httpsCallable<
  { correct: string; childAnswer: string },
  { score: number; errors: DictationError[] }
>(fns, 'markAnswer')

const _generateMathsQuestions = httpsCallable<
  { level: Level },
  { questions: MathsQuestion[] }
>(fns, 'generateMathsQuestions')

const _markMathsSession = httpsCallable<
  { questions: MathsQuestion[]; childAnswers: string[] },
  { results: MathsQuestionResult[]; totalScore: number }
>(fns, 'markMathsSession')

export async function generateSentences(level: Level): Promise<string[]> {
  const result = await _generateSentences({ level })
  return result.data.sentences
}

export async function generateAudio(text: string): Promise<string> {
  const result = await _generateAudio({ text })
  const base64 = result.data.audio
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
  const blob = new Blob([bytes], { type: 'audio/mp3' })
  return URL.createObjectURL(blob)
}

export async function markAnswer(
  correct: string,
  childAnswer: string
): Promise<{ score: number; errors: DictationError[] }> {
  const result = await _markAnswer({ correct, childAnswer })
  return result.data
}

export async function generateMathsQuestions(level: Level): Promise<MathsQuestion[]> {
  const result = await _generateMathsQuestions({ level })
  return result.data.questions
}

export async function markMathsSession(
  questions: MathsQuestion[],
  childAnswers: string[]
): Promise<{ results: MathsQuestionResult[]; totalScore: number }> {
  const result = await _markMathsSession({ questions, childAnswers })
  return result.data
}

const _generateVerbalQuestions = httpsCallable<
  { level: Level; paperLength: number; recentQuestions?: string[] },
  { questions: VerbalQuestion[] }
>(fns, 'generateVerbalQuestions')

export async function generateVerbalQuestions(level: Level, paperLength: number, recentQuestions?: string[]): Promise<VerbalQuestion[]> {
  const result = await _generateVerbalQuestions({ level, paperLength, recentQuestions })
  return result.data.questions
}

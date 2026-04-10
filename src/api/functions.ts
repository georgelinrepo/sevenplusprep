// src/api/functions.ts
import { httpsCallable } from 'firebase/functions'
import { fns } from '../firebase'
import type { Level, DictationError } from '../types'

const _generateSentences = httpsCallable<{ level: Level }, { sentences: string[] }>(
  fns, 'generateSentences'
)

const _markAnswer = httpsCallable<
  { correct: string; childAnswer: string },
  { score: number; errors: DictationError[] }
>(fns, 'markAnswer')

export async function generateSentences(level: Level): Promise<string[]> {
  const result = await _generateSentences({ level })
  return result.data.sentences
}

export async function markAnswer(
  correct: string,
  childAnswer: string
): Promise<{ score: number; errors: DictationError[] }> {
  const result = await _markAnswer({ correct, childAnswer })
  return result.data
}

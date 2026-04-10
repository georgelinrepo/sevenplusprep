// src/api/functions.ts
import { httpsCallable } from 'firebase/functions'
import { fns } from '../firebase'
import type { Level, DictationError } from '../types'

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

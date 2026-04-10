// src/api/children.ts
import {
  collection, doc, addDoc, getDocs, updateDoc, serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase'
import type { Child, Level, Session } from '../types'

const LEVELS: Level[] = ['Beginner', 'Developing', 'Confident', 'Stretch']
const HIGH_THRESHOLD = 80
const LOW_THRESHOLD = 50
const CONSECUTIVE_NEEDED = 3

export function evaluateProgression(
  child: Pick<Child, 'level' | 'consecutiveHighScores' | 'consecutiveLowScores'>,
  sessionScore: number
): Pick<Child, 'level' | 'consecutiveHighScores' | 'consecutiveLowScores'> {
  const currentIndex = LEVELS.indexOf(child.level)
  let { consecutiveHighScores, consecutiveLowScores } = child
  let level = child.level

  if (sessionScore >= HIGH_THRESHOLD) {
    consecutiveHighScores += 1
    consecutiveLowScores = 0
  } else if (sessionScore < LOW_THRESHOLD) {
    consecutiveLowScores += 1
    consecutiveHighScores = 0
  } else {
    consecutiveHighScores = 0
    consecutiveLowScores = 0
  }

  if (consecutiveHighScores >= CONSECUTIVE_NEEDED && currentIndex < LEVELS.length - 1) {
    level = LEVELS[currentIndex + 1]
    consecutiveHighScores = 0
    consecutiveLowScores = 0
  } else if (consecutiveLowScores >= CONSECUTIVE_NEEDED && currentIndex > 0) {
    level = LEVELS[currentIndex - 1]
    consecutiveLowScores = 0
    consecutiveHighScores = 0
  }

  return { level, consecutiveHighScores, consecutiveLowScores }
}

export async function getChildren(): Promise<Child[]> {
  const snap = await getDocs(collection(db, 'children'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Child))
}

export async function addChild(name: string): Promise<Child> {
  const data = {
    name,
    createdAt: serverTimestamp(),
    level: 'Beginner' as Level,
    consecutiveHighScores: 0,
    consecutiveLowScores: 0,
    mathsLevel: 'Beginner' as Level,
    mathsConsecutiveHighScores: 0,
    mathsConsecutiveLowScores: 0,
  }
  const ref = await addDoc(collection(db, 'children'), data)
  return { id: ref.id, ...data, createdAt: new Date().toISOString() }
}

export async function saveSession(child: Child, session: Omit<Session, 'id'>): Promise<void> {
  await addDoc(
    collection(db, 'children', child.id, 'sessions'),
    { ...session, date: serverTimestamp() }
  )
  const progression = evaluateProgression(child, session.totalScore)
  await updateDoc(doc(db, 'children', child.id), progression)
}

export async function getSessions(childId: string): Promise<Session[]> {
  const snap = await getDocs(collection(db, 'children', childId, 'sessions'))
  return snap.docs
    .map(d => {
      const data = d.data()
      return {
        id: d.id,
        ...data,
        // Firestore serverTimestamp() comes back as a Timestamp object — convert to ISO string
        date: data.date?.toDate?.()?.toISOString() ?? data.date ?? '',
      } as Session
    })
    .sort((a, b) => a.date.localeCompare(b.date))
}

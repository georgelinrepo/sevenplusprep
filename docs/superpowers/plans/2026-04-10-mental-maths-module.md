# Mental Maths Module — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mental maths practice module alongside dictation — 15 TTS-read questions, parent answer entry, AI marking, Firestore persistence, progression tracking, and a dedicated dashboard.

**Architecture:** Two new Cloud Functions (`generateMathsQuestions`, `markMathsSession`) follow the same pattern as existing dictation functions. Three new maths fields are added to the `Child` document and a `mathsSessions` subcollection mirrors `sessions`. Six new frontend pages are added; the existing `ChildCard` and `Home` are updated to route through a new `ModuleSelect` screen.

**Tech Stack:** TypeScript, React, React Router v6, Firebase Firestore, Firebase Cloud Functions v2, Anthropic Claude API (claude-haiku-4-5-20251001), Recharts

---

### Task 1: Extend types.ts with maths types

**Files:**
- Modify: `src/types.ts`
- Modify: `src/api/children.test.ts`

- [ ] **Step 1: Write failing tests**

Add to the bottom of `src/api/children.test.ts`:

```typescript
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
```

Also add `Level` to the import at the top of `children.test.ts`:
```typescript
import type { Child, Level } from '../types'
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run src/api/children.test.ts`
Expected: TypeScript error — `evaluateProgression` currently only accepts `Child`, not a plain object

- [ ] **Step 3: Update src/types.ts**

Replace the full contents:

```typescript
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
```

- [ ] **Step 4: Update evaluateProgression signature in src/api/children.ts**

Change the function signature so it accepts a plain object (not full `Child`) — this makes the maths pseudo-child pattern work without casting:

```typescript
export function evaluateProgression(
  child: Pick<Child, 'level' | 'consecutiveHighScores' | 'consecutiveLowScores'>,
  sessionScore: number
): Pick<Child, 'level' | 'consecutiveHighScores' | 'consecutiveLowScores'> {
```

The function body is unchanged. Only the parameter type changes from `Child` to `Pick<Child, ...>`.

- [ ] **Step 5: Run tests to verify pass**

Run: `npx vitest run src/api/children.test.ts`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/api/children.ts src/api/children.test.ts
git commit -m "feat: add maths types to types.ts, relax evaluateProgression signature"
```

---

### Task 2: Extend children.ts — maths API and deleteChild

**Files:**
- Modify: `src/api/children.ts`
- Modify: `src/api/children.test.ts`

- [ ] **Step 1: Write failing tests**

Add to the bottom of `src/api/children.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run src/api/children.test.ts`
Expected: FAIL — those exports don't exist yet

- [ ] **Step 3: Replace src/api/children.ts**

```typescript
// src/api/children.ts
import {
  collection, doc, addDoc, getDocs, updateDoc, deleteDoc, serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase'
import type { Child, Level, Session, MathsSession } from '../types'

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
        date: data.date?.toDate?.()?.toISOString() ?? data.date ?? '',
      } as Session
    })
    .sort((a, b) => a.date.localeCompare(b.date))
}

export async function saveMathsSession(child: Child, session: Omit<MathsSession, 'id'>): Promise<void> {
  await addDoc(
    collection(db, 'children', child.id, 'mathsSessions'),
    { ...session, date: serverTimestamp() }
  )
  const pseudo = {
    level: child.mathsLevel,
    consecutiveHighScores: child.mathsConsecutiveHighScores,
    consecutiveLowScores: child.mathsConsecutiveLowScores,
  }
  const progression = evaluateProgression(pseudo, session.totalScore)
  await updateDoc(doc(db, 'children', child.id), {
    mathsLevel: progression.level,
    mathsConsecutiveHighScores: progression.consecutiveHighScores,
    mathsConsecutiveLowScores: progression.consecutiveLowScores,
  })
}

export async function getMathsSessions(childId: string): Promise<MathsSession[]> {
  const snap = await getDocs(collection(db, 'children', childId, 'mathsSessions'))
  return snap.docs
    .map(d => {
      const data = d.data()
      return {
        id: d.id,
        ...data,
        date: data.date?.toDate?.()?.toISOString() ?? data.date ?? '',
      } as MathsSession
    })
    .sort((a, b) => a.date.localeCompare(b.date))
}

export async function deleteChild(childId: string): Promise<void> {
  const sessionsSnap = await getDocs(collection(db, 'children', childId, 'sessions'))
  for (const d of sessionsSnap.docs) {
    await deleteDoc(d.ref)
  }
  const mathsSnap = await getDocs(collection(db, 'children', childId, 'mathsSessions'))
  for (const d of mathsSnap.docs) {
    await deleteDoc(d.ref)
  }
  await deleteDoc(doc(db, 'children', childId))
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run src/api/children.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/api/children.ts src/api/children.test.ts
git commit -m "feat: add saveMathsSession, getMathsSessions, deleteChild; initialise maths fields in addChild"
```

---

### Task 3: Add maths client API wrappers to functions.ts

**Files:**
- Modify: `src/api/functions.ts`
- Modify: `src/api/functions.test.ts`

- [ ] **Step 1: Write failing test**

Replace `src/api/functions.test.ts`:

```typescript
// src/api/functions.test.ts
import { describe, it, expect, vi } from 'vitest'

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() => vi.fn()),
  getFunctions: vi.fn(),
}))

vi.mock('../firebase', () => ({
  fns: {},
}))

describe('functions api', () => {
  it('exports generateSentences, markAnswer, generateAudio, generateMathsQuestions, markMathsSession', async () => {
    const mod = await import('./functions')
    expect(typeof mod.generateSentences).toBe('function')
    expect(typeof mod.markAnswer).toBe('function')
    expect(typeof mod.generateAudio).toBe('function')
    expect(typeof mod.generateMathsQuestions).toBe('function')
    expect(typeof mod.markMathsSession).toBe('function')
  })
})
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run src/api/functions.test.ts`
Expected: FAIL — `generateMathsQuestions` and `markMathsSession` not exported

- [ ] **Step 3: Replace src/api/functions.ts**

```typescript
// src/api/functions.ts
import { httpsCallable } from 'firebase/functions'
import { fns } from '../firebase'
import type { Level, DictationError, MathsQuestion, MathsQuestionResult } from '../types'

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
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run src/api/functions.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/api/functions.ts src/api/functions.test.ts
git commit -m "feat: add generateMathsQuestions and markMathsSession client API wrappers"
```

---

### Task 4: Cloud Function — generateMathsQuestions

**Files:**
- Create: `functions/src/generateMathsQuestions.ts`

- [ ] **Step 1: Create functions/src/generateMathsQuestions.ts**

```typescript
// functions/src/generateMathsQuestions.ts
import Anthropic from '@anthropic-ai/sdk'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { anthropicKey } from './generateSentences'

const LEVEL_CALIBRATION: Record<string, string> = {
  Beginner: 'straightforward: simple number bonds to 20, counting, basic shape names, simple time (o\'clock, half past)',
  Developing: 'moderate: addition/subtraction within 100, 2× and 5× tables, simple fractions (half, quarter), coins to £1',
  Confident: 'challenging: all four operations within 200, all times tables to 10×, fractions of amounts, time intervals, word problems',
  Stretch: 'exam-level: multi-step problems, all tables to 12×, fractions/decimals, complex word problems, sequences — mirroring actual SPJ 7+ difficulty',
}

export const generateMathsQuestions = onCall(
  { secrets: [anthropicKey], region: 'europe-west2' },
  async (request) => {
    const { level } = request.data as { level: string }
    if (!LEVEL_CALIBRATION[level]) {
      throw new HttpsError('invalid-argument', `Unknown level: ${level}`)
    }

    const client = new Anthropic({ apiKey: anthropicKey.value() })

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `Generate exactly 15 mental maths questions for a 6-7 year old child practising for the St Paul's Juniors (Colet Court) 7+ entrance exam.

Difficulty: ${LEVEL_CALIBRATION[level]}

Ordering: Q1-5 straightforward arithmetic, Q6-10 tables/fractions/money/time, Q11-15 multi-step word problems and reasoning.

Rules:
- No more than 4 questions from any single category
- Valid categories: arithmetic, tables, fractions, money, time, word_problem, sequence, measures, shape, reasoning
- Phrase questions as an invigilator reads them aloud (e.g. "What is six multiplied by seven?" not "6×7=")
- Expected answer MUST include units where applicable: money → p or £ (e.g. "45p", "£1.20"), length → cm or m, time → digits or words (e.g. "3:15"), weight → g or kg
- For bare number answers (arithmetic, tables) no units needed

Return ONLY a JSON array of exactly 15 objects, no markdown fences:
[
  { "question": "What is six multiplied by seven?", "expected": "42", "category": "tables" }
]`,
      }],
    })

    const raw = (response.content[0] as { text: string }).text.trim()
    const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    try {
      const questions = JSON.parse(text)
      if (!Array.isArray(questions) || questions.length !== 15) {
        throw new Error('Expected array of 15 questions')
      }
      return { questions }
    } catch {
      throw new HttpsError('internal', 'Failed to parse generated questions')
    }
  }
)
```

- [ ] **Step 2: Commit (hold — commit together with Task 5)**

---

### Task 5: Cloud Function — markMathsSession + update index.ts

**Files:**
- Create: `functions/src/markMathsSession.ts`
- Modify: `functions/src/index.ts`

- [ ] **Step 1: Create functions/src/markMathsSession.ts**

```typescript
// functions/src/markMathsSession.ts
import Anthropic from '@anthropic-ai/sdk'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { anthropicKey } from './generateSentences'

interface MathsQuestion {
  question: string
  expected: string
  category: string
}

export const markMathsSession = onCall(
  { secrets: [anthropicKey], region: 'europe-west2' },
  async (request) => {
    const { questions, childAnswers } = request.data as {
      questions: MathsQuestion[]
      childAnswers: string[]
    }

    if (
      !Array.isArray(questions) || questions.length !== 15 ||
      !Array.isArray(childAnswers) || childAnswers.length !== 15
    ) {
      throw new HttpsError('invalid-argument', 'questions and childAnswers must each be arrays of 15')
    }

    const client = new Anthropic({ apiKey: anthropicKey.value() })

    const questionList = questions
      .map((q, i) => `Q${i + 1}: "${q.question}" | Expected: "${q.expected}" | Child wrote: "${childAnswers[i]}"`)
      .join('\n')

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3000,
      messages: [{
        role: 'user',
        content: `Mark these 15 mental maths answers for a 6-7 year old child.

${questionList}

Marking rules:
- Unit equivalence: "45p" = "£0.45" (both correct); bare "45" for a money answer = INCORRECT
- Time equivalence: "3:15" = "quarter past 3" = "quarter past three" (all correct)
- Correct number but wrong/missing unit = INCORRECT; feedback must explain why
- Spelling of number words: accept reasonable attempts (e.g. "forteen" for fourteen = correct)
- For incorrect answers: short, child-friendly feedback (max 10 words)
- For correct answers: feedback = "Correct"
- totalScore = percentage of 15 correct, rounded to nearest integer

Return ONLY valid JSON, no markdown fences:
{
  "results": [
    {
      "question": "<original question text>",
      "expected": "<expected answer>",
      "childAnswer": "<what child wrote>",
      "correct": true,
      "feedback": "Correct",
      "category": "<category from original question>"
    }
  ],
  "totalScore": 80
}`,
      }],
    })

    const raw = (response.content[0] as { text: string }).text.trim()
    const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    try {
      const result = JSON.parse(text)
      if (!Array.isArray(result.results) || result.results.length !== 15 || typeof result.totalScore !== 'number') {
        throw new Error('Invalid response shape')
      }
      return result
    } catch (e) {
      console.error('Parse error:', e, 'Raw:', text)
      throw new HttpsError('internal', 'Failed to parse marking response')
    }
  }
)
```

- [ ] **Step 2: Update functions/src/index.ts**

```typescript
// functions/src/index.ts
export { generateSentences } from './generateSentences'
export { markAnswer } from './markAnswer'
export { generateAudio } from './generateAudio'
export { generateMathsQuestions } from './generateMathsQuestions'
export { markMathsSession } from './markMathsSession'
```

- [ ] **Step 3: Verify TypeScript compiles in functions**

Run: `cd functions && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add functions/src/generateMathsQuestions.ts functions/src/markMathsSession.ts functions/src/index.ts
git commit -m "feat: add generateMathsQuestions and markMathsSession Cloud Functions"
```

---

### Task 6: Update ChildCard + Home + App routing

**Files:**
- Modify: `src/components/ChildCard.tsx`
- Modify: `src/pages/Home.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Replace src/components/ChildCard.tsx**

```tsx
// src/components/ChildCard.tsx
import type { Child } from '../types'

const LEVEL_COLOURS: Record<string, string> = {
  Beginner: '#6c757d',
  Developing: '#0d6efd',
  Confident: '#198754',
  Stretch: '#dc3545',
}

interface Props {
  child: Child
  onSelect: () => void
  onDelete: () => void
}

export function ChildCard({ child, onSelect, onDelete }: Props) {
  function handleDelete() {
    if (window.confirm(`Delete ${child.name}? All sessions will be permanently deleted. This cannot be undone.`)) {
      onDelete()
    }
  }

  return (
    <div style={{ border: '1px solid #dee2e6', borderRadius: 12, padding: 24, minWidth: 200, textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 8 }}>👤</div>
      <h2 style={{ margin: '0 0 8px' }}>{child.name}</h2>
      <span style={{
        background: LEVEL_COLOURS[child.level],
        color: 'white',
        borderRadius: 20,
        padding: '4px 12px',
        fontSize: 14,
        fontWeight: 600,
      }}>
        {child.level}
      </span>
      <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'center' }}>
        <button
          onClick={onSelect}
          style={{ padding: '8px 20px', cursor: 'pointer', background: '#0d6efd', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600 }}
        >
          Select
        </button>
        <button
          onClick={handleDelete}
          style={{ padding: '8px 12px', cursor: 'pointer', background: 'transparent', border: '1px solid #dee2e6', borderRadius: 8, color: '#dc3545' }}
        >
          Delete
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Replace src/pages/Home.tsx**

```tsx
// src/pages/Home.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChildCard } from '../components/ChildCard'
import { AddChildModal } from '../components/AddChildModal'
import { getChildren, addChild, deleteChild } from '../api/children'
import type { Child } from '../types'

export function Home() {
  const [children, setChildren] = useState<Child[]>([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getChildren().then(c => { setChildren(c); setLoading(false) })
  }, [])

  async function handleAddChild(name: string) {
    const child = await addChild(name)
    setChildren(prev => [...prev, child])
  }

  async function handleDeleteChild(childId: string) {
    await deleteChild(childId)
    setChildren(prev => prev.filter(c => c.id !== childId))
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 48 }}>Loading...</div>

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 32 }}>
      <h1 style={{ textAlign: 'center', marginBottom: 8 }}>SevenPlusPrep</h1>
      <p style={{ textAlign: 'center', color: '#6c757d', marginBottom: 40 }}>SPJ 7+ Practice</p>

      {children.length === 0 && (
        <p style={{ textAlign: 'center', color: '#6c757d' }}>No children yet — add one to get started.</p>
      )}

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
        {children.map(child => (
          <ChildCard
            key={child.id}
            child={child}
            onSelect={() => navigate(`/child/${child.id}`)}
            onDelete={() => handleDeleteChild(child.id)}
          />
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: 32 }}>
        <button
          onClick={() => setShowModal(true)}
          style={{ padding: '12px 24px', cursor: 'pointer', border: '2px dashed #dee2e6', borderRadius: 12, background: 'transparent', fontSize: 16, color: '#6c757d' }}
        >
          + Add Child
        </button>
      </div>

      {showModal && <AddChildModal onAdd={handleAddChild} onClose={() => setShowModal(false)} />}
    </div>
  )
}
```

- [ ] **Step 3: Replace src/App.tsx**

```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Home } from './pages/Home'
import { ModuleSelect } from './pages/ModuleSelect'
import { SessionStart } from './pages/SessionStart'
import { Dictation } from './pages/Dictation'
import { Results } from './pages/Results'
import { Dashboard } from './pages/Dashboard'
import { MathsStart } from './pages/MathsStart'
import { MathsPlay } from './pages/MathsPlay'
import { MathsEntry } from './pages/MathsEntry'
import { MathsResults } from './pages/MathsResults'
import { MathsDashboard } from './pages/MathsDashboard'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/child/:childId" element={<ModuleSelect />} />
        <Route path="/session-start/:childId" element={<SessionStart />} />
        <Route path="/dictation/:childId" element={<Dictation />} />
        <Route path="/results/:childId" element={<Results />} />
        <Route path="/dashboard/:childId" element={<Dashboard />} />
        <Route path="/maths-start/:childId" element={<MathsStart />} />
        <Route path="/maths-play/:childId" element={<MathsPlay />} />
        <Route path="/maths-entry/:childId" element={<MathsEntry />} />
        <Route path="/maths-results/:childId" element={<MathsResults />} />
        <Route path="/maths-dashboard/:childId" element={<MathsDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 4: Verify TypeScript (expect errors only for missing new pages)**

Run: `npx tsc --noEmit 2>&1 | grep -v "Cannot find module"` 
Expected: No errors except "Cannot find module" for the 5 new pages not yet created

- [ ] **Step 5: Commit**

```bash
git add src/components/ChildCard.tsx src/pages/Home.tsx src/App.tsx
git commit -m "feat: update ChildCard to Select/Delete, update Home subtitle and navigation, add maths routes"
```

---

### Task 7: ModuleSelect page

**Files:**
- Create: `src/pages/ModuleSelect.tsx`

- [ ] **Step 1: Create src/pages/ModuleSelect.tsx**

```tsx
// src/pages/ModuleSelect.tsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getChildren } from '../api/children'
import type { Child } from '../types'

const LEVEL_COLOURS: Record<string, string> = {
  Beginner: '#6c757d',
  Developing: '#0d6efd',
  Confident: '#198754',
  Stretch: '#dc3545',
}

export function ModuleSelect() {
  const { childId } = useParams<{ childId: string }>()
  const [child, setChild] = useState<Child | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    getChildren().then(children => {
      const found = children.find(c => c.id === childId)
      if (found) setChild(found)
    })
  }, [childId])

  if (!child) return <div style={{ textAlign: 'center', padding: 48 }}>Loading...</div>

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 32 }}>
      <button
        onClick={() => navigate('/')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6c757d', fontSize: 16, marginBottom: 24 }}
      >
        ← Back
      </button>

      <h1 style={{ textAlign: 'center', marginBottom: 8 }}>{child.name}</h1>
      <p style={{ textAlign: 'center', color: '#6c757d', marginBottom: 40 }}>Choose a module</p>

      <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
        <div style={{ border: '1px solid #dee2e6', borderRadius: 12, padding: 32, minWidth: 240, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
          <h2 style={{ margin: '0 0 8px' }}>Dictation</h2>
          <span style={{
            background: LEVEL_COLOURS[child.level],
            color: 'white',
            borderRadius: 20,
            padding: '4px 12px',
            fontSize: 13,
            fontWeight: 600,
            display: 'inline-block',
            marginBottom: 20,
          }}>
            {child.level}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={() => navigate(`/session-start/${child.id}`)}
              style={{ padding: '10px 20px', cursor: 'pointer', background: '#0d6efd', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 15 }}
            >
              Start Session
            </button>
            <button
              onClick={() => navigate(`/dashboard/${child.id}`)}
              style={{ padding: '10px 20px', cursor: 'pointer', background: 'transparent', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 15 }}
            >
              View Progress
            </button>
          </div>
        </div>

        <div style={{ border: '1px solid #dee2e6', borderRadius: 12, padding: 32, minWidth: 240, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔢</div>
          <h2 style={{ margin: '0 0 8px' }}>Mental Maths</h2>
          <span style={{
            background: LEVEL_COLOURS[child.mathsLevel],
            color: 'white',
            borderRadius: 20,
            padding: '4px 12px',
            fontSize: 13,
            fontWeight: 600,
            display: 'inline-block',
            marginBottom: 20,
          }}>
            {child.mathsLevel}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={() => navigate(`/maths-start/${child.id}`)}
              style={{ padding: '10px 20px', cursor: 'pointer', background: '#0d6efd', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 15 }}
            >
              Start Session
            </button>
            <button
              onClick={() => navigate(`/maths-dashboard/${child.id}`)}
              style={{ padding: '10px 20px', cursor: 'pointer', background: 'transparent', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 15 }}
            >
              View Progress
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/ModuleSelect.tsx
git commit -m "feat: add ModuleSelect page"
```

---

### Task 8: MathsStart page

**Files:**
- Create: `src/pages/MathsStart.tsx`

- [ ] **Step 1: Create src/pages/MathsStart.tsx**

```tsx
// src/pages/MathsStart.tsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getChildren } from '../api/children'
import { generateMathsQuestions } from '../api/functions'
import type { Child, MathsQuestion } from '../types'

export function MathsStart() {
  const { childId } = useParams<{ childId: string }>()
  const [child, setChild] = useState<Child | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    getChildren().then(children => {
      const found = children.find(c => c.id === childId)
      if (found) setChild(found)
    })
  }, [childId])

  async function handleBegin() {
    if (!child) return
    setGenerating(true)
    setError(null)
    try {
      const questions: MathsQuestion[] = await generateMathsQuestions(child.mathsLevel)
      navigate(`/maths-play/${child.id}`, { state: { questions } })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate questions — please try again')
      setGenerating(false)
    }
  }

  if (!child) return <div style={{ textAlign: 'center', padding: 48 }}>Loading...</div>

  return (
    <div style={{ maxWidth: 500, margin: '80px auto', padding: 32, textAlign: 'center' }}>
      <h1>{child.name}</h1>
      <div style={{ fontSize: 20, color: '#6c757d', marginBottom: 8 }}>
        Maths level: <strong>{child.mathsLevel}</strong>
      </div>
      <p style={{ color: '#6c757d', marginBottom: 40 }}>
        15 questions, each read aloud twice.<br />
        Write answers on paper, then enter them at the end.
      </p>
      <button
        onClick={handleBegin}
        disabled={generating}
        style={{ padding: '16px 40px', fontSize: 20, cursor: 'pointer', background: '#0d6efd', color: 'white', border: 'none', borderRadius: 12, fontWeight: 600 }}
      >
        {generating ? 'Generating questions...' : 'Begin Session'}
      </button>
      {error && <p style={{ color: '#dc3545', marginTop: 16 }}>{error}</p>}
      <br />
      <button
        onClick={() => navigate(`/child/${childId}`)}
        style={{ marginTop: 16, padding: '10px 20px', cursor: 'pointer', background: 'transparent', border: 'none', color: '#6c757d', fontSize: 16 }}
      >
        ← Back
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/MathsStart.tsx
git commit -m "feat: add MathsStart page"
```

---

### Task 9: MathsPlay page

**Files:**
- Create: `src/pages/MathsPlay.tsx`

Per-question cycle: `read1` (TTS) → `pause1` (5s) → `read2` (TTS) → `countdown` (15s) → next question or navigate to entry.

- [ ] **Step 1: Create src/pages/MathsPlay.tsx**

```tsx
// src/pages/MathsPlay.tsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useTTS } from '../hooks/useTTS'
import { useCountdown } from '../hooks/useCountdown'
import { CountdownTimer } from '../components/CountdownTimer'
import type { MathsQuestion } from '../types'

type Phase = 'read1' | 'pause1' | 'read2' | 'countdown' | 'paused'

interface LocationState {
  questions: MathsQuestion[]
}

export function MathsPlay() {
  const { childId } = useParams<{ childId: string }>()
  const navigate = useNavigate()
  const { state } = useLocation() as { state: LocationState }
  const { speak, stop } = useTTS()
  const { seconds, start: startCountdown, reset: resetCountdown } = useCountdown()

  const questions: MathsQuestion[] = state?.questions ?? []
  const [currentIndex, setCurrentIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('read1')
  const [pausedPhase, setPausedPhase] = useState<Phase | null>(null)

  useEffect(() => {
    if (!questions[currentIndex]) return

    if (phase === 'read1') {
      speak(questions[currentIndex].question, () => setPhase('pause1'))
    } else if (phase === 'pause1') {
      startCountdown(5, () => setPhase('read2'))
    } else if (phase === 'read2') {
      speak(questions[currentIndex].question, () => setPhase('countdown'))
    } else if (phase === 'countdown') {
      startCountdown(15, () => {
        if (currentIndex < 14) {
          setCurrentIndex(i => i + 1)
          resetCountdown()
          setPhase('read1')
        } else {
          navigate(`/maths-entry/${childId}`, { state: { questions } })
        }
      })
    }
  }, [phase, currentIndex])

  function handlePause() {
    stop()
    resetCountdown()
    setPausedPhase(phase)
    setPhase('paused')
  }

  function handleResume() {
    const resumeTo = pausedPhase ?? 'read1'
    setPausedPhase(null)
    setPhase(resumeTo)
  }

  if (!questions.length) {
    return <div style={{ textAlign: 'center', padding: 48 }}>No questions — go back and start again.</div>
  }

  const progress = (currentIndex / 15) * 100

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <span style={{ color: '#6c757d' }}>Question {currentIndex + 1} of 15</span>
        <button
          onClick={phase === 'paused' ? handleResume : handlePause}
          style={{ padding: '8px 16px', cursor: 'pointer', background: 'transparent', border: '1px solid #dee2e6', borderRadius: 8 }}
        >
          {phase === 'paused' ? '▶ Resume' : '⏸ Pause'}
        </button>
      </div>

      <div style={{ height: 8, background: '#e9ecef', borderRadius: 4, marginBottom: 32, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: '#0d6efd', width: `${progress}%`, transition: 'width 0.3s' }} />
      </div>

      {phase === 'paused' && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏸</div>
          <p style={{ color: '#6c757d', fontSize: 18 }}>Paused</p>
        </div>
      )}

      {(phase === 'read1' || phase === 'read2') && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🔊</div>
          <div style={{ fontSize: 20, color: '#6c757d' }}>
            {phase === 'read1' ? 'Listen carefully...' : 'Write your answer...'}
          </div>
        </div>
      )}

      {phase === 'pause1' && (
        <CountdownTimer seconds={seconds} label="Get ready to write..." />
      )}

      {phase === 'countdown' && (
        <CountdownTimer seconds={seconds} label="Write your answer on paper" />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/MathsPlay.tsx
git commit -m "feat: add MathsPlay page with TTS playback and per-question countdown"
```

---

### Task 10: MathsEntry page

**Files:**
- Create: `src/pages/MathsEntry.tsx`

- [ ] **Step 1: Create src/pages/MathsEntry.tsx**

```tsx
// src/pages/MathsEntry.tsx
import { useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { markMathsSession } from '../api/functions'
import type { MathsQuestion } from '../types'

interface LocationState {
  questions: MathsQuestion[]
}

export function MathsEntry() {
  const { childId } = useParams<{ childId: string }>()
  const navigate = useNavigate()
  const { state } = useLocation() as { state: LocationState }

  const questions: MathsQuestion[] = state?.questions ?? []
  const [answers, setAnswers] = useState<string[]>(Array(15).fill(''))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allFilled = answers.every(a => a.trim().length > 0)

  function handleAnswer(index: number, value: string) {
    setAnswers(prev => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  async function handleSubmit() {
    if (!allFilled) return
    setSubmitting(true)
    setError(null)
    try {
      const { results, totalScore } = await markMathsSession(questions, answers)
      navigate(`/maths-results/${childId}`, { state: { results, totalScore } })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Marking failed — please try again')
      setSubmitting(false)
    }
  }

  if (!questions.length) {
    return <div style={{ textAlign: 'center', padding: 48 }}>No session data — go back and start again.</div>
  }

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: 24 }}>
      <h1 style={{ marginBottom: 8 }}>Enter Answers</h1>
      <p style={{ color: '#6c757d', marginBottom: 32 }}>Type exactly what your child wrote on paper for each question.</p>

      {questions.map((q, i) => (
        <div key={i} style={{ marginBottom: 20, padding: 16, background: '#f8f9fa', borderRadius: 8 }}>
          <div style={{ fontWeight: 600, marginBottom: 8, color: '#6c757d', fontSize: 13 }}>Q{i + 1}</div>
          <div style={{ marginBottom: 10, fontSize: 16 }}>{q.question}</div>
          <input
            type="text"
            value={answers[i]}
            onChange={e => handleAnswer(i, e.target.value)}
            placeholder="Child's answer"
            style={{ width: '100%', padding: '8px 12px', fontSize: 16, borderRadius: 6, border: '1px solid #dee2e6', boxSizing: 'border-box' }}
          />
        </div>
      ))}

      {error && <p style={{ color: '#dc3545', marginBottom: 12 }}>{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={!allFilled || submitting}
        style={{
          width: '100%', padding: '16px', fontSize: 18,
          cursor: allFilled ? 'pointer' : 'not-allowed',
          background: allFilled ? '#198754' : '#6c757d',
          color: 'white', border: 'none', borderRadius: 8, fontWeight: 600,
        }}
      >
        {submitting ? 'Marking...' : 'Submit Answers'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/MathsEntry.tsx
git commit -m "feat: add MathsEntry page for parent answer input"
```

---

### Task 11: MathsResults page

**Files:**
- Create: `src/pages/MathsResults.tsx`

- [ ] **Step 1: Create src/pages/MathsResults.tsx**

```tsx
// src/pages/MathsResults.tsx
import { useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { getChildren, saveMathsSession } from '../api/children'
import type { MathsQuestionResult } from '../types'

interface LocationState {
  results: MathsQuestionResult[]
  totalScore: number
}

const CATEGORY_LABELS: Record<string, string> = {
  arithmetic: 'Arithmetic',
  tables: 'Times Tables',
  fractions: 'Fractions',
  money: 'Money',
  time: 'Time',
  word_problem: 'Word Problems',
  sequence: 'Sequences',
  measures: 'Measures',
  shape: 'Shape',
  reasoning: 'Reasoning',
}

export function MathsResults() {
  const { childId } = useParams<{ childId: string }>()
  const navigate = useNavigate()
  const { state } = useLocation() as { state: LocationState }
  const { results, totalScore } = state || {}

  useEffect(() => {
    if (!childId || !results) return
    getChildren().then(children => {
      const child = children.find(c => c.id === childId)
      if (!child) return
      saveMathsSession(child, {
        date: new Date().toISOString(),
        level: child.mathsLevel,
        totalScore,
        questions: results,
      })
    })
  }, [])

  if (!results) return <div style={{ textAlign: 'center', padding: 48 }}>No session data.</div>

  const correctCount = results.filter(r => r.correct).length
  const scoreColour = totalScore >= 80 ? '#198754' : totalScore >= 50 ? '#fd7e14' : '#dc3545'

  const categoryMap: Record<string, { correct: number; total: number }> = {}
  for (const r of results) {
    if (!categoryMap[r.category]) categoryMap[r.category] = { correct: 0, total: 0 }
    categoryMap[r.category].total++
    if (r.correct) categoryMap[r.category].correct++
  }

  return (
    <div style={{ maxWidth: 640, margin: '40px auto', padding: 24 }}>
      <h1 style={{ textAlign: 'center', marginBottom: 4 }}>Session Complete</h1>
      <div style={{ textAlign: 'center', fontSize: 56, fontWeight: 700, color: scoreColour, marginBottom: 4 }}>
        {correctCount} / 15
      </div>
      <div style={{ textAlign: 'center', fontSize: 24, color: scoreColour, marginBottom: 32 }}>
        {totalScore}%
      </div>

      <h3>By Category</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 32 }}>
        <thead>
          <tr style={{ background: '#f8f9fa' }}>
            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Category</th>
            <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>Score</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(categoryMap).map(([cat, { correct, total }]) => (
            <tr key={cat} style={{ borderBottom: '1px solid #dee2e6' }}>
              <td style={{ padding: '8px 12px' }}>{CATEGORY_LABELS[cat] ?? cat}</td>
              <td style={{ padding: '8px 12px', textAlign: 'center' }}>{correct}/{total}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Question Breakdown</h3>
      {results.map((r, i) => (
        <div key={i} style={{ border: '1px solid #dee2e6', borderRadius: 8, padding: 16, marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
            <span style={{ fontWeight: 600, color: '#6c757d', fontSize: 13 }}>Q{i + 1}</span>
            <span style={{ fontSize: 20 }}>{r.correct ? '✅' : '❌'}</span>
          </div>
          <div style={{ marginBottom: 4 }}>{r.question}</div>
          <div style={{ fontSize: 14, color: '#6c757d' }}>
            Child wrote: <strong>{r.childAnswer || '—'}</strong>
            {!r.correct && <> · Expected: <strong>{r.expected}</strong></>}
          </div>
          {!r.correct && r.feedback && r.feedback !== 'Correct' && (
            <div style={{ marginTop: 6, fontSize: 13, color: '#dc3545' }}>{r.feedback}</div>
          )}
        </div>
      ))}

      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <button
          onClick={() => navigate('/')}
          style={{ flex: 1, padding: '14px', fontSize: 16, cursor: 'pointer', background: '#0d6efd', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600 }}
        >
          Back to Home
        </button>
        <button
          onClick={() => navigate(`/maths-dashboard/${childId}`)}
          style={{ flex: 1, padding: '14px', fontSize: 16, cursor: 'pointer', background: 'transparent', border: '1px solid #dee2e6', borderRadius: 8 }}
        >
          View Progress
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/MathsResults.tsx
git commit -m "feat: add MathsResults page"
```

---

### Task 12: MathsDashboard page

**Files:**
- Create: `src/pages/MathsDashboard.tsx`

- [ ] **Step 1: Create src/pages/MathsDashboard.tsx**

```tsx
// src/pages/MathsDashboard.tsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { getChildren, getMathsSessions } from '../api/children'
import type { Child, MathsSession, MathsCategory } from '../types'

const CATEGORY_COLOURS: Record<MathsCategory, string> = {
  arithmetic: '#0d6efd',
  tables: '#198754',
  fractions: '#dc3545',
  money: '#fd7e14',
  time: '#6f42c1',
  word_problem: '#20c997',
  sequence: '#d63384',
  measures: '#0dcaf0',
  shape: '#ffc107',
  reasoning: '#6c757d',
}

const CATEGORIES: MathsCategory[] = [
  'arithmetic', 'tables', 'fractions', 'money', 'time',
  'word_problem', 'sequence', 'measures', 'shape', 'reasoning',
]

const CATEGORY_LABELS: Record<MathsCategory, string> = {
  arithmetic: 'Arithmetic',
  tables: 'Tables',
  fractions: 'Fractions',
  money: 'Money',
  time: 'Time',
  word_problem: 'Word Problems',
  sequence: 'Sequences',
  measures: 'Measures',
  shape: 'Shape',
  reasoning: 'Reasoning',
}

function SessionHistoryItem({ session, index }: { session: MathsSession; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const date = new Date(session.date).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  const scoreColour = session.totalScore >= 80 ? '#198754' : session.totalScore >= 50 ? '#fd7e14' : '#dc3545'

  return (
    <div style={{ border: '1px solid #dee2e6', borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{ width: '100%', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' }}
      >
        <span style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span style={{ fontWeight: 700, color: '#6c757d', minWidth: 32 }}>#{index}</span>
          <span style={{ fontSize: 14, color: '#6c757d' }}>{date}</span>
          <span style={{ fontSize: 13, background: '#f8f9fa', borderRadius: 12, padding: '2px 10px' }}>{session.level}</span>
        </span>
        <span style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span style={{ fontWeight: 700, color: scoreColour }}>{session.totalScore}%</span>
          <span style={{ color: '#6c757d' }}>{expanded ? '▲' : '▼'}</span>
        </span>
      </button>
      {expanded && (
        <div style={{ padding: '0 16px 16px' }}>
          {session.questions.map((q, i) => (
            <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0', fontSize: 14 }}>
              <span style={{ marginRight: 8 }}>{q.correct ? '✅' : '❌'}</span>
              <span style={{ color: '#6c757d', marginRight: 8 }}>Q{i + 1}</span>
              {q.question}
              {!q.correct && (
                <span style={{ color: '#6c757d', marginLeft: 8 }}>
                  (wrote: <strong>{q.childAnswer || '—'}</strong> · expected: <strong>{q.expected}</strong>)
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function MathsDashboard() {
  const { childId } = useParams<{ childId: string }>()
  const navigate = useNavigate()
  const [child, setChild] = useState<Child | null>(null)
  const [sessions, setSessions] = useState<MathsSession[]>([])

  useEffect(() => {
    if (!childId) return
    getChildren().then(children => {
      const found = children.find(c => c.id === childId)
      if (found) setChild(found)
    })
    getMathsSessions(childId).then(setSessions)
  }, [childId])

  const recent = sessions.slice(-10)

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

  const sessionLabel = (s: MathsSession, i: number) =>
    `#${sessions.length - recent.length + i + 1} (${formatDate(s.date)})`

  const scoreData = recent.map((s, i) => ({
    session: sessionLabel(s, i),
    score: s.totalScore,
  }))

  const errorData = recent.map((s, i) => {
    const counts: Record<string, number> = {}
    for (const cat of CATEGORIES) counts[cat] = 0
    for (const q of s.questions) {
      if (!q.correct) counts[q.category] = (counts[q.category] || 0) + 1
    }
    return { session: sessionLabel(s, i), ...counts }
  })

  const toNextLevel = 3 - (child?.mathsConsecutiveHighScores ?? 0)
  const toDropLevel = 3 - (child?.mathsConsecutiveLowScores ?? 0)

  if (!child) return <div style={{ textAlign: 'center', padding: 48 }}>Loading...</div>

  const sortedSessions = [...sessions].reverse()

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', padding: 24 }}>
      <button
        onClick={() => navigate(`/child/${childId}`)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6c757d', fontSize: 16, marginBottom: 16 }}
      >
        ← Back
      </button>

      <h1>{child.name}'s Maths Progress</h1>
      <p>Current maths level: <strong>{child.mathsLevel}</strong></p>

      <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
        <div style={{ flex: 1, background: '#d1e7dd', borderRadius: 8, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{toNextLevel}</div>
          <div style={{ fontSize: 13, color: '#0f5132' }}>strong sessions to level up</div>
        </div>
        <div style={{ flex: 1, background: '#f8d7da', borderRadius: 8, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{toDropLevel}</div>
          <div style={{ fontSize: 13, color: '#842029' }}>weak sessions to level down</div>
        </div>
        <div style={{ flex: 1, background: '#f8f9fa', borderRadius: 8, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{sessions.length}</div>
          <div style={{ fontSize: 13, color: '#6c757d' }}>total sessions</div>
        </div>
      </div>

      {sessions.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#6c757d' }}>No sessions yet — complete a maths session to see progress here.</p>
      ) : (
        <>
          <h3>Score Trend (last 10 sessions)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={scoreData}>
              <XAxis dataKey="session" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#0d6efd" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>

          <h3 style={{ marginTop: 32 }}>Errors by Category (last 10 sessions)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={errorData}>
              <XAxis dataKey="session" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend formatter={(value) => CATEGORY_LABELS[value as MathsCategory] ?? value} />
              {CATEGORIES.map(cat => (
                <Line
                  key={cat}
                  type="monotone"
                  dataKey={cat}
                  stroke={CATEGORY_COLOURS[cat]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>

          <h3 style={{ marginTop: 32 }}>Session History</h3>
          {sortedSessions.map((session, i) => (
            <SessionHistoryItem
              key={session.id}
              session={session}
              index={sessions.length - i}
            />
          ))}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run full TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/pages/MathsDashboard.tsx
git commit -m "feat: add MathsDashboard page"
```

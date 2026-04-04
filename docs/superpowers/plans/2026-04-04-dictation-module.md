# SevenPlusPrep Dictation Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React + Firebase web app for SPJ 7+ dictation practice — AI-generated sentences read aloud 3 times via TTS, child writes on paper, parent types answer, Claude marks errors by category with progress tracking per child.

**Architecture:** Vite + React + TypeScript SPA hosted on Firebase Hosting. Firebase Cloud Functions (TypeScript) handle all Claude API calls and Firestore writes. The browser uses the Web Speech API for TTS. No authentication — single shared URL for the family.

**Tech Stack:** React 18, TypeScript, Vite, Firebase 10 (Hosting + Cloud Functions + Firestore), Anthropic Claude API (`claude-haiku-4-5-20251001` for cost efficiency), Recharts for dashboard charts, Vitest for unit tests.

---

## Prerequisites (Do These First)

### Firebase Setup (one-time manual steps)

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com) and create a new project called `sevenplusprep`
2. Enable **Firestore Database** (production mode, region: `europe-west2`)
3. Enable **Firebase Hosting**
4. Enable **Cloud Functions** (requires Blaze pay-as-you-go plan — costs are negligible for personal use)
5. Install Firebase CLI: `npm install -g firebase-tools`
6. Log in: `firebase login`
7. Get your Firebase web app config: Project Settings → Add app → Web → copy the config object
8. Get an Anthropic API key from [https://console.anthropic.com](https://console.anthropic.com)

---

## File Structure

```
sevenplusprep/
├── src/
│   ├── main.tsx                        # React entry point
│   ├── App.tsx                         # Router setup
│   ├── firebase.ts                     # Firebase SDK init
│   ├── types.ts                        # Shared TypeScript types
│   ├── pages/
│   │   ├── Home.tsx                    # Child profile cards
│   │   ├── SessionStart.tsx            # Pre-session screen
│   │   ├── Dictation.tsx               # Main session screen
│   │   ├── Results.tsx                 # Post-session results
│   │   └── Dashboard.tsx              # Parent progress view
│   ├── components/
│   │   ├── ChildCard.tsx               # Profile card on home screen
│   │   ├── AddChildModal.tsx           # Add new child form
│   │   ├── CountdownTimer.tsx          # Large countdown between reads
│   │   ├── SentenceResult.tsx          # Sentence with highlighted errors
│   │   └── ErrorBreakdownTable.tsx     # Error category summary table
│   ├── hooks/
│   │   ├── useTTS.ts                   # Web Speech API wrapper
│   │   └── useCountdown.ts            # Countdown timer logic
│   └── api/
│       └── functions.ts               # Cloud Function call wrappers
├── functions/
│   ├── src/
│   │   ├── index.ts                   # Function exports
│   │   ├── generateSentences.ts       # Claude sentence generation
│   │   ├── markAnswer.ts              # Claude answer marking
│   │   └── progression.ts            # Level progression logic
│   ├── package.json
│   └── tsconfig.json
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
├── firebase.json
└── .firebaserc
```

---

## Task 1: Project Scaffold + Firebase Init

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`
- Create: `firebase.json`, `.firebaserc`, `functions/package.json`, `functions/tsconfig.json`
- Create: `.env.local` (gitignored), `.gitignore`

- [ ] **Step 1: Scaffold the Vite + React + TypeScript project**

```bash
cd C:/Projects/sevenplusprep
npm create vite@latest . -- --template react-ts
npm install
```

Expected output: `vite`, `react`, `react-dom`, `typescript` in `package.json`.

- [ ] **Step 2: Install frontend dependencies**

```bash
npm install firebase react-router-dom recharts
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitest/coverage-v8
```

- [ ] **Step 3: Configure Vitest in `vite.config.ts`**

Replace the generated `vite.config.ts` with:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
  },
})
```

- [ ] **Step 4: Create `src/test-setup.ts`**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Initialise Firebase in the project**

```bash
firebase init
```

Select when prompted:
- Features: **Firestore**, **Functions**, **Hosting**
- Project: select `sevenplusprep` (created in prerequisites)
- Firestore rules: `firestore.rules` (default)
- Functions language: **TypeScript**
- Hosting public dir: `dist`
- Single-page app: **Yes**

- [ ] **Step 6: Install Cloud Functions dependencies**

```bash
cd functions
npm install @anthropic-ai/sdk firebase-admin firebase-functions
npm install -D typescript @types/node
cd ..
```

- [ ] **Step 7: Create `.env.local` (never commit this file)**

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=sevenplusprep.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=sevenplusprep
VITE_FIREBASE_STORAGE_BUCKET=sevenplusprep.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

- [ ] **Step 8: Add `.env.local` to `.gitignore`**

Add this line to `.gitignore`:
```
.env.local
functions/.secret.local
```

- [ ] **Step 9: Store the Anthropic API key as a Firebase secret**

```bash
firebase functions:secrets:set ANTHROPIC_API_KEY
# Paste your key when prompted
```

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite React TypeScript project with Firebase"
```

---

## Task 2: Shared Types

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Write the types**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: add shared TypeScript types"
```

---

## Task 3: Firebase Initialisation + Firestore Helpers

**Files:**
- Create: `src/firebase.ts`
- Create: `src/test-setup.ts` (already done in Task 1)
- Create: `src/firebase.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/firebase.test.ts
import { describe, it, expect, vi } from 'vitest'

// We test the shape of functions, not Firebase internals
describe('firebase module', () => {
  it('exports db and functions', async () => {
    // Just verify the module loads without error
    const mod = await import('./firebase')
    expect(mod.db).toBeDefined()
    expect(mod.fns).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/firebase.test.ts
```

Expected: FAIL — `firebase.ts` not found

- [ ] **Step 3: Create `src/firebase.ts`**

```typescript
// src/firebase.ts
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const fns = getFunctions(app, 'europe-west2')
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/firebase.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/firebase.ts src/firebase.test.ts
git commit -m "feat: initialise Firebase app, Firestore, and Functions"
```

---

## Task 4: Firestore Child Profiles (CRUD)

**Files:**
- Create: `src/api/children.ts`
- Create: `src/api/children.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/api/children.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { evaluateProgression } from './children'
import type { Child } from '../types'

describe('evaluateProgression', () => {
  const baseChild: Child = {
    id: 'test',
    name: 'James',
    createdAt: new Date().toISOString(),
    level: 'Beginner',
    consecutiveHighScores: 0,
    consecutiveLowScores: 0,
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/api/children.test.ts
```

Expected: FAIL — `children.ts` not found

- [ ] **Step 3: Create `src/api/children.ts`**

```typescript
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
  child: Child,
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
  }
  const ref = await addDoc(collection(db, 'children'), data)
  return { id: ref.id, ...data, createdAt: new Date().toISOString() }
}

export async function saveSession(child: Child, session: Omit<Session, 'id'>): Promise<void> {
  const sessionRef = await addDoc(
    collection(db, 'children', child.id, 'sessions'),
    { ...session, date: serverTimestamp() }
  )
  const progression = evaluateProgression(child, session.totalScore)
  await updateDoc(doc(db, 'children', child.id), progression)
}

export async function getSessions(childId: string): Promise<Session[]> {
  const snap = await getDocs(collection(db, 'children', childId, 'sessions'))
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Session))
    .sort((a, b) => a.date.localeCompare(b.date))
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/api/children.test.ts
```

Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/api/children.ts src/api/children.test.ts
git commit -m "feat: add child profile CRUD and level progression logic"
```

---

## Task 5: Cloud Functions — Sentence Generation

**Files:**
- Create: `functions/src/generateSentences.ts`
- Create: `functions/src/index.ts`

- [ ] **Step 1: Create `functions/src/generateSentences.ts`**

```typescript
// functions/src/generateSentences.ts
import Anthropic from '@anthropic-ai/sdk'
import { defineSecret } from 'firebase-functions/params'
import { onCall, HttpsError } from 'firebase-functions/v2/https'

export const anthropicKey = defineSecret('ANTHROPIC_API_KEY')

const LEVEL_PROMPTS: Record<string, string> = {
  Beginner: `Generate 3 simple dictation sentences for a 6-7 year old child practising for UK 7+ entrance exams.
Each sentence should:
- Be 12-16 words long
- Use simple, everyday vocabulary a 6-year-old would know
- Include at least one capital letter and a full stop
- Include ONE challenge: either a common homophone (to/too/two, see/sea) OR a simple contraction (it's, don't)
- Sound like a natural sentence a child might encounter`,

  Developing: `Generate 3 dictation sentences for a 6-7 year old practising for UK 7+ entrance exams at developing level.
Each sentence should:
- Be 15-20 words long
- Include slightly more sophisticated vocabulary
- Include at least one comma or question mark
- Include ONE or TWO challenges from: homophones (their/there/they're, where/wear), contractions (wouldn't, couldn't, they've), possessive apostrophes`,

  Confident: `Generate 3 dictation sentences for a 6-7 year old practising for UK 7+ entrance exams at confident level.
Each sentence should:
- Be 18-22 words long
- Include varied punctuation (comma, question mark OR exclamation mark, speech marks if natural)
- Include TWO challenges: a homophone AND a contraction or possessive apostrophe
- Use vocabulary that is challenging but age-appropriate`,

  Stretch: `Generate 3 dictation sentences for a 6-7 year old practising for St Paul's Juniors 7+ entrance exam at stretch/exam level.
Each sentence should:
- Be 20-25 words long
- Include sophisticated vocabulary (slightly above typical 6-year-old level — this is an elite exam)
- Include varied punctuation including speech marks, commas, and question or exclamation marks
- Include MULTIPLE challenges: at least one homophone AND one contraction AND correct apostrophe use
- Mirror the difficulty of SPJ 7+ dictation passages`,
}

export const generateSentences = onCall(
  { secrets: [anthropicKey] },
  async (request) => {
    const { level } = request.data as { level: string }
    if (!LEVEL_PROMPTS[level]) {
      throw new HttpsError('invalid-argument', `Unknown level: ${level}`)
    }

    const client = new Anthropic({ apiKey: anthropicKey.value() })

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `${LEVEL_PROMPTS[level]}

Return ONLY a JSON array of 3 strings, no markdown fences, no explanation. Example format:
["Sentence one here.", "Sentence two here.", "Sentence three here."]`,
      }],
    })

    const text = (response.content[0] as { text: string }).text.trim()
    try {
      const sentences: string[] = JSON.parse(text)
      if (!Array.isArray(sentences) || sentences.length !== 3) {
        throw new Error('Expected array of 3 strings')
      }
      return { sentences }
    } catch {
      throw new HttpsError('internal', 'Failed to parse generated sentences')
    }
  }
)
```

- [ ] **Step 2: Create `functions/src/index.ts`**

```typescript
// functions/src/index.ts
export { generateSentences } from './generateSentences'
export { markAnswer } from './markAnswer'
```

Note: `markAnswer` will be added in the next task. For now, add a placeholder export to allow compilation:

```typescript
// functions/src/index.ts
export { generateSentences } from './generateSentences'
// markAnswer added in Task 6
```

- [ ] **Step 3: Verify functions compile**

```bash
cd functions
npm run build
```

Expected: `lib/` directory created with compiled JS, no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
cd ..
git add functions/src/generateSentences.ts functions/src/index.ts
git commit -m "feat: add generateSentences Cloud Function"
```

---

## Task 6: Cloud Functions — Answer Marking

**Files:**
- Create: `functions/src/markAnswer.ts`
- Modify: `functions/src/index.ts`

- [ ] **Step 1: Create `functions/src/markAnswer.ts`**

```typescript
// functions/src/markAnswer.ts
import Anthropic from '@anthropic-ai/sdk'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { anthropicKey } from './generateSentences'

const MARKING_PROMPT = (correct: string, childAnswer: string) => `
You are marking a dictation exercise for a 6-7 year old child practising for UK 7+ entrance exams.

Correct sentence: "${correct}"
Child's answer: "${childAnswer}"

Compare the two sentences and identify errors. Ignore extra spaces or minor whitespace differences.

Error types:
- "homophone": child used the wrong homophone (e.g. "there" instead of "their")
- "contraction": child got a contraction wrong (e.g. wrote "its" instead of "it's", or "dont" instead of "don't")
- "punctuation": missing or wrong punctuation mark, wrong capitalisation
- "spelling": a spelling mistake that is not a homophone or contraction error

Return ONLY valid JSON, no markdown fences:
{
  "score": <number 0-100>,
  "errors": [
    { "type": "homophone"|"contraction"|"punctuation"|"spelling", "word": "<what child wrote>", "correction": "<correct version>" }
  ]
}

Score guide: 100 = perfect, deduct ~15 points per error. Minimum 0.
If the answer is perfect, return { "score": 100, "errors": [] }.`

export const markAnswer = onCall(
  { secrets: [anthropicKey] },
  async (request) => {
    const { correct, childAnswer } = request.data as { correct: string; childAnswer: string }
    if (!correct || !childAnswer) {
      throw new HttpsError('invalid-argument', 'correct and childAnswer are required')
    }

    const client = new Anthropic({ apiKey: anthropicKey.value() })

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: MARKING_PROMPT(correct, childAnswer) }],
    })

    const text = (response.content[0] as { text: string }).text.trim()
    try {
      const result = JSON.parse(text)
      if (typeof result.score !== 'number' || !Array.isArray(result.errors)) {
        throw new Error('Invalid response shape')
      }
      return result
    } catch {
      throw new HttpsError('internal', 'Failed to parse marking response')
    }
  }
)
```

- [ ] **Step 2: Update `functions/src/index.ts`**

```typescript
// functions/src/index.ts
export { generateSentences } from './generateSentences'
export { markAnswer } from './markAnswer'
```

- [ ] **Step 3: Verify functions compile**

```bash
cd functions
npm run build
cd ..
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add functions/src/markAnswer.ts functions/src/index.ts
git commit -m "feat: add markAnswer Cloud Function"
```

---

## Task 7: Frontend API Wrappers

**Files:**
- Create: `src/api/functions.ts`
- Create: `src/api/functions.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
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
  it('exports generateSentences and markAnswer', async () => {
    const mod = await import('./functions')
    expect(typeof mod.generateSentences).toBe('function')
    expect(typeof mod.markAnswer).toBe('function')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/api/functions.test.ts
```

Expected: FAIL

- [ ] **Step 3: Create `src/api/functions.ts`**

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/api/functions.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/api/functions.ts src/api/functions.test.ts
git commit -m "feat: add frontend wrappers for Cloud Functions"
```

---

## Task 8: useTTS Hook

**Files:**
- Create: `src/hooks/useTTS.ts`
- Create: `src/hooks/useTTS.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/hooks/useTTS.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTTS } from './useTTS'

const mockSpeak = vi.fn()
const mockCancel = vi.fn()

beforeEach(() => {
  mockSpeak.mockClear()
  mockCancel.mockClear()
  Object.defineProperty(window, 'speechSynthesis', {
    value: { speak: mockSpeak, cancel: mockCancel, speaking: false },
    writable: true,
  })
  global.SpeechSynthesisUtterance = vi.fn().mockImplementation((text) => ({ text })) as any
})

describe('useTTS', () => {
  it('calls speechSynthesis.speak with the text', () => {
    const { result } = renderHook(() => useTTS())
    act(() => result.current.speak('Hello world'))
    expect(mockSpeak).toHaveBeenCalledTimes(1)
  })

  it('calls speechSynthesis.cancel on stop', () => {
    const { result } = renderHook(() => useTTS())
    act(() => result.current.stop())
    expect(mockCancel).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/hooks/useTTS.test.ts
```

Expected: FAIL

- [ ] **Step 3: Create `src/hooks/useTTS.ts`**

```typescript
// src/hooks/useTTS.ts
export function useTTS() {
  function speak(text: string, onEnd?: () => void) {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.85   // slightly slower than default for clarity
    utterance.lang = 'en-GB'
    if (onEnd) utterance.onend = onEnd
    window.speechSynthesis.speak(utterance)
  }

  function stop() {
    if (window.speechSynthesis) window.speechSynthesis.cancel()
  }

  return { speak, stop }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/hooks/useTTS.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useTTS.ts src/hooks/useTTS.test.ts
git commit -m "feat: add useTTS hook wrapping Web Speech API"
```

---

## Task 9: useCountdown Hook

**Files:**
- Create: `src/hooks/useCountdown.ts`
- Create: `src/hooks/useCountdown.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/hooks/useCountdown.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCountdown } from './useCountdown'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useCountdown', () => {
  it('starts at the given seconds', () => {
    const { result } = renderHook(() => useCountdown())
    act(() => result.current.start(15))
    expect(result.current.seconds).toBe(15)
  })

  it('counts down each second', () => {
    const { result } = renderHook(() => useCountdown())
    act(() => result.current.start(15))
    act(() => vi.advanceTimersByTime(3000))
    expect(result.current.seconds).toBe(12)
  })

  it('calls onComplete when reaching 0', () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() => useCountdown())
    act(() => result.current.start(3, onComplete))
    act(() => vi.advanceTimersByTime(3000))
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(result.current.seconds).toBe(0)
  })

  it('does not go below 0', () => {
    const { result } = renderHook(() => useCountdown())
    act(() => result.current.start(2))
    act(() => vi.advanceTimersByTime(5000))
    expect(result.current.seconds).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/hooks/useCountdown.test.ts
```

Expected: FAIL

- [ ] **Step 3: Create `src/hooks/useCountdown.ts`**

```typescript
// src/hooks/useCountdown.ts
import { useState, useRef } from 'react'

export function useCountdown() {
  const [seconds, setSeconds] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function start(from: number, onComplete?: () => void) {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setSeconds(from)
    let remaining = from
    intervalRef.current = setInterval(() => {
      remaining -= 1
      if (remaining <= 0) {
        clearInterval(intervalRef.current!)
        setSeconds(0)
        onComplete?.()
      } else {
        setSeconds(remaining)
      }
    }, 1000)
  }

  function reset() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setSeconds(0)
  }

  return { seconds, start, reset }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/hooks/useCountdown.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useCountdown.ts src/hooks/useCountdown.test.ts
git commit -m "feat: add useCountdown hook"
```

---

## Task 10: Home Screen

**Files:**
- Create: `src/pages/Home.tsx`
- Create: `src/components/ChildCard.tsx`
- Create: `src/components/AddChildModal.tsx`

- [ ] **Step 1: Create `src/components/ChildCard.tsx`**

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
  onStart: () => void
  onViewProgress: () => void
}

export function ChildCard({ child, onStart, onViewProgress }: Props) {
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
        <button onClick={onStart} style={{ padding: '8px 20px', cursor: 'pointer', background: '#0d6efd', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600 }}>
          Start Session
        </button>
        <button onClick={onViewProgress} style={{ padding: '8px 16px', cursor: 'pointer', background: 'transparent', border: '1px solid #dee2e6', borderRadius: 8 }}>
          Progress
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/components/AddChildModal.tsx`**

```tsx
// src/components/AddChildModal.tsx
import { useState } from 'react'

interface Props {
  onAdd: (name: string) => void
  onClose: () => void
}

export function AddChildModal({ onAdd, onClose }: Props) {
  const [name, setName] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (name.trim()) {
      onAdd(name.trim())
      onClose()
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: 'white', borderRadius: 12, padding: 32, minWidth: 320 }}>
        <h2 style={{ marginTop: 0 }}>Add Child</h2>
        <form onSubmit={handleSubmit}>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Child's name"
            style={{ width: '100%', padding: 12, fontSize: 18, borderRadius: 8, border: '1px solid #dee2e6', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 20px', cursor: 'pointer', border: '1px solid #dee2e6', borderRadius: 8, background: 'transparent' }}>Cancel</button>
            <button type="submit" disabled={!name.trim()} style={{ padding: '10px 20px', cursor: 'pointer', background: '#0d6efd', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600 }}>Add</button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `src/pages/Home.tsx`**

```tsx
// src/pages/Home.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChildCard } from '../components/ChildCard'
import { AddChildModal } from '../components/AddChildModal'
import { getChildren, addChild } from '../api/children'
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

  if (loading) return <div style={{ textAlign: 'center', padding: 48 }}>Loading...</div>

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 32 }}>
      <h1 style={{ textAlign: 'center', marginBottom: 8 }}>SevenPlusPrep</h1>
      <p style={{ textAlign: 'center', color: '#6c757d', marginBottom: 40 }}>SPJ 7+ Dictation Practice</p>

      {children.length === 0 && (
        <p style={{ textAlign: 'center', color: '#6c757d' }}>No children yet — add one to get started.</p>
      )}

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
        {children.map(child => (
          <ChildCard
            key={child.id}
            child={child}
            onStart={() => navigate(`/session-start/${child.id}`)}
            onViewProgress={() => navigate(`/dashboard/${child.id}`)}
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

- [ ] **Step 4: Commit**

```bash
git add src/pages/Home.tsx src/components/ChildCard.tsx src/components/AddChildModal.tsx
git commit -m "feat: add Home screen with child profile cards"
```

---

## Task 11: Session Start Screen

**Files:**
- Create: `src/pages/SessionStart.tsx`

- [ ] **Step 1: Create `src/pages/SessionStart.tsx`**

```tsx
// src/pages/SessionStart.tsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getChildren } from '../api/children'
import type { Child } from '../types'

export function SessionStart() {
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
    <div style={{ maxWidth: 500, margin: '80px auto', padding: 32, textAlign: 'center' }}>
      <h1>{child.name}</h1>
      <div style={{ fontSize: 20, color: '#6c757d', marginBottom: 8 }}>
        Current level: <strong>{child.level}</strong>
      </div>
      <p style={{ color: '#6c757d', marginBottom: 40 }}>
        3 sentences, each read aloud 3 times.<br />
        Write on paper, then check your work.
      </p>
      <button
        onClick={() => navigate(`/dictation/${child.id}`)}
        style={{ padding: '16px 40px', fontSize: 20, cursor: 'pointer', background: '#0d6efd', color: 'white', border: 'none', borderRadius: 12, fontWeight: 600 }}
      >
        Begin Session
      </button>
      <br />
      <button
        onClick={() => navigate('/')}
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
git add src/pages/SessionStart.tsx
git commit -m "feat: add SessionStart screen"
```

---

## Task 12: Dictation Screen

**Files:**
- Create: `src/pages/Dictation.tsx`
- Create: `src/components/CountdownTimer.tsx`

- [ ] **Step 1: Create `src/components/CountdownTimer.tsx`**

```tsx
// src/components/CountdownTimer.tsx
interface Props {
  seconds: number
  label: string
}

export function CountdownTimer({ seconds, label }: Props) {
  return (
    <div style={{ textAlign: 'center', padding: 24 }}>
      <div style={{ fontSize: 80, fontWeight: 700, color: seconds <= 5 ? '#dc3545' : '#0d6efd', lineHeight: 1 }}>
        {seconds}
      </div>
      <div style={{ color: '#6c757d', fontSize: 16, marginTop: 8 }}>{label}</div>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/pages/Dictation.tsx`**

```tsx
// src/pages/Dictation.tsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getChildren } from '../api/children'
import { generateSentences, markAnswer } from '../api/functions'
import { useTTS } from '../hooks/useTTS'
import { useCountdown } from '../hooks/useCountdown'
import { CountdownTimer } from '../components/CountdownTimer'
import type { Child, SentenceResult, Level } from '../types'

type Phase = 'loading' | 'read1' | 'pause1' | 'read2' | 'pause2' | 'read3' | 'pause3' | 'input' | 'marked'

export function Dictation() {
  const { childId } = useParams<{ childId: string }>()
  const navigate = useNavigate()
  const { speak } = useTTS()
  const { seconds, start: startCountdown, reset: resetCountdown } = useCountdown()

  const [child, setChild] = useState<Child | null>(null)
  const [sentences, setSentences] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('loading')
  const [childAnswer, setChildAnswer] = useState('')
  const [results, setResults] = useState<SentenceResult[]>([])
  const [marking, setMarking] = useState(false)
  const [currentResult, setCurrentResult] = useState<SentenceResult | null>(null)

  useEffect(() => {
    async function init() {
      const children = await getChildren()
      const found = children.find(c => c.id === childId)
      if (!found) return
      setChild(found)
      const generated = await generateSentences(found.level as Level)
      setSentences(generated)
      setPhase('read1')
    }
    init()
  }, [childId])

  // Trigger TTS on read phases
  useEffect(() => {
    if (!sentences[currentIndex]) return
    const sentence = sentences[currentIndex]

    if (phase === 'read1') {
      speak(sentence, () => {
        setPhase('pause1')
        startCountdown(15, () => setPhase('read2'))
      })
    } else if (phase === 'read2') {
      speak(sentence, () => {
        setPhase('pause2')
        startCountdown(15, () => setPhase('read3'))
      })
    } else if (phase === 'read3') {
      speak(sentence, () => {
        setPhase('pause3')
        startCountdown(10, () => setPhase('input'))
      })
    }
  }, [phase, currentIndex, sentences])

  async function handleMarkAnswer() {
    if (!sentences[currentIndex] || !childAnswer.trim()) return
    setMarking(true)
    const result = await markAnswer(sentences[currentIndex], childAnswer)
    const sentenceResult: SentenceResult = {
      correct: sentences[currentIndex],
      childAnswer,
      score: result.score,
      errors: result.errors,
    }
    setCurrentResult(sentenceResult)
    setResults(prev => [...prev, sentenceResult])
    setPhase('marked')
    setMarking(false)
  }

  function handleNext() {
    if (currentIndex < 2) {
      setCurrentIndex(i => i + 1)
      setChildAnswer('')
      setCurrentResult(null)
      resetCountdown()
      setPhase('read1')
    } else {
      // All 3 sentences done — go to results
      navigate(`/results/${childId}`, { state: { results, level: child?.level } })
    }
  }

  if (phase === 'loading' || !child) {
    return <div style={{ textAlign: 'center', padding: 48, fontSize: 20 }}>Generating sentences...</div>
  }

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <span style={{ color: '#6c757d' }}>{child.name} — {child.level}</span>
        <span style={{ fontWeight: 700 }}>Sentence {currentIndex + 1} of 3</span>
      </div>

      {(phase === 'read1' || phase === 'read2' || phase === 'read3') && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🔊</div>
          <div style={{ fontSize: 20, color: '#6c757d' }}>
            {phase === 'read1' && 'Listen carefully...'}
            {phase === 'read2' && 'Write it down...'}
            {phase === 'read3' && 'Check your work...'}
          </div>
        </div>
      )}

      {(phase === 'pause1' || phase === 'pause2' || phase === 'pause3') && (
        <CountdownTimer
          seconds={seconds}
          label={phase === 'pause3' ? 'Check your work before the next read' : 'Continue writing...'}
        />
      )}

      {phase === 'input' && (
        <div>
          <p style={{ fontSize: 18, marginBottom: 16 }}>Type exactly what the child wrote on paper:</p>
          <textarea
            autoFocus
            value={childAnswer}
            onChange={e => setChildAnswer(e.target.value)}
            rows={4}
            style={{ width: '100%', padding: 12, fontSize: 16, borderRadius: 8, border: '1px solid #dee2e6', boxSizing: 'border-box', resize: 'vertical' }}
            placeholder="Type child's answer here..."
          />
          <button
            onClick={handleMarkAnswer}
            disabled={!childAnswer.trim() || marking}
            style={{ marginTop: 12, width: '100%', padding: '14px', fontSize: 18, cursor: 'pointer', background: '#198754', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600 }}
          >
            {marking ? 'Marking...' : 'Mark Answer'}
          </button>
        </div>
      )}

      {phase === 'marked' && currentResult && (
        <div>
          <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 16 }}>
            {currentResult.score >= 80 ? '✅' : currentResult.score >= 50 ? '🟡' : '❌'}
            {' '}{currentResult.score}/100
          </div>
          <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <div style={{ marginBottom: 8 }}><strong>Correct:</strong> {currentResult.correct}</div>
            <div><strong>Child wrote:</strong> {currentResult.childAnswer}</div>
          </div>
          {currentResult.errors.length === 0 ? (
            <p style={{ color: '#198754', fontWeight: 600, textAlign: 'center' }}>Perfect! No errors.</p>
          ) : (
            <ul style={{ paddingLeft: 20 }}>
              {currentResult.errors.map((e, i) => (
                <li key={i} style={{ marginBottom: 4 }}>
                  <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{e.type}</span>: wrote "{e.word}" → should be "{e.correction}"
                </li>
              ))}
            </ul>
          )}
          <button
            onClick={handleNext}
            style={{ marginTop: 16, width: '100%', padding: '14px', fontSize: 18, cursor: 'pointer', background: '#0d6efd', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600 }}
          >
            {currentIndex < 2 ? 'Next Sentence →' : 'See Results →'}
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/Dictation.tsx src/components/CountdownTimer.tsx
git commit -m "feat: add Dictation session screen with TTS and countdown"
```

---

## Task 13: Results Screen

**Files:**
- Create: `src/pages/Results.tsx`
- Create: `src/components/SentenceResult.tsx`
- Create: `src/components/ErrorBreakdownTable.tsx`

- [ ] **Step 1: Create `src/components/ErrorBreakdownTable.tsx`**

```tsx
// src/components/ErrorBreakdownTable.tsx
import type { SentenceResult, ErrorType } from '../types'

const ERROR_TYPES: ErrorType[] = ['homophone', 'punctuation', 'contraction', 'spelling']

interface Props {
  sentences: SentenceResult[]
}

export function ErrorBreakdownTable({ sentences }: Props) {
  const counts: Record<ErrorType, number> = { homophone: 0, punctuation: 0, contraction: 0, spelling: 0 }
  for (const s of sentences) {
    for (const e of s.errors) {
      counts[e.type] = (counts[e.type] || 0) + 1
    }
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
      <thead>
        <tr>
          {ERROR_TYPES.map(t => (
            <th key={t} style={{ padding: '8px 16px', background: '#f8f9fa', border: '1px solid #dee2e6', textTransform: 'capitalize' }}>{t}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          {ERROR_TYPES.map(t => (
            <td key={t} style={{ padding: '8px 16px', textAlign: 'center', border: '1px solid #dee2e6', fontWeight: 600, color: counts[t] > 0 ? '#dc3545' : '#198754' }}>
              {counts[t]}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  )
}
```

- [ ] **Step 2: Create `src/components/SentenceResult.tsx`**

```tsx
// src/components/SentenceResult.tsx
import type { SentenceResult as SR } from '../types'

interface Props {
  result: SR
  index: number
}

export function SentenceResultCard({ result, index }: Props) {
  return (
    <div style={{ border: '1px solid #dee2e6', borderRadius: 8, padding: 16, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <strong>Sentence {index + 1}</strong>
        <span style={{ fontWeight: 700, color: result.score >= 80 ? '#198754' : result.score >= 50 ? '#fd7e14' : '#dc3545' }}>
          {result.score}/100
        </span>
      </div>
      <div style={{ marginBottom: 4 }}><strong>Correct:</strong> {result.correct}</div>
      <div style={{ marginBottom: 8 }}><strong>Child wrote:</strong> {result.childAnswer}</div>
      {result.errors.length > 0 && (
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          {result.errors.map((e, i) => (
            <li key={i} style={{ fontSize: 14, color: '#dc3545' }}>
              <span style={{ textTransform: 'capitalize' }}>{e.type}</span>: "{e.word}" → "{e.correction}"
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create `src/pages/Results.tsx`**

```tsx
// src/pages/Results.tsx
import { useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { getChildren, saveSession } from '../api/children'
import { ErrorBreakdownTable } from '../components/ErrorBreakdownTable'
import { SentenceResultCard } from '../components/SentenceResult'
import type { SentenceResult, Level } from '../types'

interface LocationState {
  results: SentenceResult[]
  level: Level
}

export function Results() {
  const { childId } = useParams<{ childId: string }>()
  const navigate = useNavigate()
  const { state } = useLocation() as { state: LocationState }
  const { results, level } = state || {}

  const totalScore = results
    ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
    : 0

  useEffect(() => {
    if (!childId || !results) return
    getChildren().then(children => {
      const child = children.find(c => c.id === childId)
      if (!child) return
      saveSession(child, {
        date: new Date().toISOString(),
        level,
        totalScore,
        sentences: results,
      })
    })
  }, [])

  if (!results) return <div style={{ textAlign: 'center', padding: 48 }}>No session data.</div>

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: 24 }}>
      <h1 style={{ textAlign: 'center' }}>Session Complete</h1>

      <div style={{ textAlign: 'center', fontSize: 64, fontWeight: 700, color: totalScore >= 80 ? '#198754' : totalScore >= 50 ? '#fd7e14' : '#dc3545', marginBottom: 8 }}>
        {totalScore}%
      </div>
      <p style={{ textAlign: 'center', color: '#6c757d', marginBottom: 24 }}>Overall score</p>

      <h3>Error Breakdown</h3>
      <ErrorBreakdownTable sentences={results} />

      <h3 style={{ marginTop: 32 }}>Sentences</h3>
      {results.map((r, i) => <SentenceResultCard key={i} result={r} index={i} />)}

      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <button
          onClick={() => navigate('/')}
          style={{ flex: 1, padding: '14px', fontSize: 16, cursor: 'pointer', background: '#0d6efd', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600 }}
        >
          Back to Home
        </button>
        <button
          onClick={() => navigate(`/dashboard/${childId}`)}
          style={{ flex: 1, padding: '14px', fontSize: 16, cursor: 'pointer', background: 'transparent', border: '1px solid #dee2e6', borderRadius: 8 }}
        >
          View Progress
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/Results.tsx src/components/SentenceResult.tsx src/components/ErrorBreakdownTable.tsx
git commit -m "feat: add Results screen with error breakdown"
```

---

## Task 14: Parent Dashboard

**Files:**
- Create: `src/pages/Dashboard.tsx`

- [ ] **Step 1: Create `src/pages/Dashboard.tsx`**

```tsx
// src/pages/Dashboard.tsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts'
import { getChildren, getSessions } from '../api/children'
import type { Child, Session } from '../types'

export function Dashboard() {
  const { childId } = useParams<{ childId: string }>()
  const navigate = useNavigate()
  const [child, setChild] = useState<Child | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])

  useEffect(() => {
    if (!childId) return
    getChildren().then(children => {
      const found = children.find(c => c.id === childId)
      if (found) setChild(found)
    })
    getSessions(childId).then(setSessions)
  }, [childId])

  const recent = sessions.slice(-10)

  const scoreData = recent.map((s, i) => ({
    session: `#${sessions.length - recent.length + i + 1}`,
    score: s.totalScore,
  }))

  const errorData = recent.map((s, i) => {
    const counts: Record<string, number> = { homophone: 0, punctuation: 0, contraction: 0, spelling: 0 }
    for (const sentence of s.sentences) {
      for (const e of sentence.errors) {
        counts[e.type] = (counts[e.type] || 0) + 1
      }
    }
    return { session: `#${sessions.length - recent.length + i + 1}`, ...counts }
  })

  const toNextLevel = 3 - (child?.consecutiveHighScores ?? 0)
  const toDropLevel = 3 - (child?.consecutiveLowScores ?? 0)

  if (!child) return <div style={{ textAlign: 'center', padding: 48 }}>Loading...</div>

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', padding: 24 }}>
      <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6c757d', fontSize: 16, marginBottom: 16 }}>← Back</button>

      <h1>{child.name}'s Progress</h1>
      <p>Current level: <strong>{child.level}</strong></p>

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
        <p style={{ textAlign: 'center', color: '#6c757d' }}>No sessions yet — complete a dictation session to see progress here.</p>
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
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={errorData}>
              <XAxis dataKey="session" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="homophone" fill="#dc3545" />
              <Bar dataKey="punctuation" fill="#fd7e14" />
              <Bar dataKey="contraction" fill="#6f42c1" />
              <Bar dataKey="spelling" fill="#0d6efd" />
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat: add parent dashboard with score trend and error charts"
```

---

## Task 15: App Router + Entry Point

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Replace `src/App.tsx`**

```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Home } from './pages/Home'
import { SessionStart } from './pages/SessionStart'
import { Dictation } from './pages/Dictation'
import { Results } from './pages/Results'
import { Dashboard } from './pages/Dashboard'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/session-start/:childId" element={<SessionStart />} />
        <Route path="/dictation/:childId" element={<Dictation />} />
        <Route path="/results/:childId" element={<Results />} />
        <Route path="/dashboard/:childId" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 2: Replace `src/main.tsx`**

```tsx
// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 3: Run the dev server to verify the app loads**

```bash
npm run dev
```

Open `http://localhost:5173` — should show the Home screen with "SevenPlusPrep" heading and "Add Child" button.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/main.tsx
git commit -m "feat: wire up React Router with all screens"
```

---

## Task 16: Deploy to Firebase

- [ ] **Step 1: Build the frontend**

```bash
npm run build
```

Expected: `dist/` directory created with no TypeScript errors.

- [ ] **Step 2: Deploy Cloud Functions first**

```bash
firebase deploy --only functions
```

Expected: Functions deployed successfully. Note the function URLs in the output.

- [ ] **Step 3: Set Firestore rules to allow read/write (no auth)**

Replace `firestore.rules` with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

Note: This is appropriate for a single-family app with no sensitive data. Do not use in a multi-user app.

- [ ] **Step 4: Deploy hosting and Firestore rules**

```bash
firebase deploy --only hosting,firestore:rules
```

- [ ] **Step 5: Open the live URL**

```bash
firebase open hosting:site
```

Expected: App loads at `https://sevenplusprep.web.app` (or your project's URL).

- [ ] **Step 6: Smoke test the full flow**
  - Add a child profile
  - Start a dictation session
  - Let the 3 TTS reads play
  - Type a (deliberately wrong) answer
  - Check errors are shown correctly
  - Check session appears on dashboard

- [ ] **Step 7: Commit**

```bash
git add firestore.rules firebase.json .firebaserc
git commit -m "chore: configure Firebase deploy (hosting, functions, firestore rules)"
git push
```

---

## Self-Review

**Spec coverage check:**
- ✅ 3 sentences per session — Dictation.tsx loops through 3
- ✅ 3 reads with countdowns (15s, 15s, 10s) — useTTS + useCountdown
- ✅ Parent types child's answer — textarea in Dictation.tsx input phase
- ✅ Claude marks errors by category — markAnswer Cloud Function
- ✅ 4 difficulty levels with descriptive names — types.ts + level prompts
- ✅ Level progression (3 consecutive at 80%+ / 50%-) — evaluateProgression + tests
- ✅ Level shown per session — SessionStart and Dictation screens
- ✅ Child profiles with name + level — children.ts + Home screen
- ✅ Session results with error breakdown — Results screen + ErrorBreakdownTable
- ✅ Parent dashboard with score trend + error charts — Dashboard screen
- ✅ Consecutive session counters shown on dashboard — toNextLevel/toDropLevel
- ✅ Firebase Hosting + Firestore + Cloud Functions — Task 1 + Task 16
- ✅ Claude API via Cloud Functions (key secured as secret) — Tasks 5 + 6
- ✅ Web Speech API for TTS — useTTS hook
- ✅ Multi-device (hosted web app) — Firebase Hosting

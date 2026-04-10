# Mental Maths Module — Design Spec
**Date:** 2026-04-10  
**Branch:** feature/mental-maths  
**Target:** St Paul's Juniors (Colet Court) 7+ entrance exam preparation

---

## Overview

A second practice module alongside dictation. The child hears 15 mental maths questions read aloud (as in the real exam), writes answers on paper, then the parent enters all answers at the end for marking. Progress is tracked separately from dictation but shares the same child profiles.

---

## 1. Data Model

### Child — new fields
Three new fields added to the existing `Child` type:

```typescript
mathsLevel: Level                   // 'Beginner' | 'Developing' | 'Confident' | 'Stretch'
mathsConsecutiveHighScores: number
mathsConsecutiveLowScores: number
```

`addChild` initialises all three to `'Beginner'` / `0` / `0`.

### New types

```typescript
type MathsCategory =
  | 'arithmetic'   // addition, subtraction within 200
  | 'tables'       // multiplication and division facts
  | 'fractions'    // half, quarter, third of amounts
  | 'money'        // coins, change, totals
  | 'time'         // clocks, duration, intervals
  | 'word_problem' // one- or two-step applied problems
  | 'sequence'     // number sequences, missing numbers
  | 'measures'     // length, weight, capacity, units
  | 'shape'        // names, sides, symmetry
  | 'reasoning'    // logic, "I'm thinking of a number…"

interface MathsQuestion {
  question: string   // phrased as read aloud: "What is six times four?"
  expected: string   // always includes units where applicable: "24", "45p", "8 cm", "3:15"
  category: MathsCategory
}

interface MathsQuestionResult {
  question: string
  expected: string
  childAnswer: string
  correct: boolean
  feedback: string   // e.g. "Correct value but missing unit — answer should be 45p"
  category: MathsCategory
}

interface MathsSession {
  id: string
  date: string         // ISO timestamp
  level: Level
  totalScore: number   // 0–100 (percentage of 15 correct, rounded)
  questions: MathsQuestionResult[]
}
```

### Firestore

New subcollection: `children/{id}/mathsSessions/{id}`

Identical query pattern to `children/{id}/sessions/{id}`. The same Timestamp → ISO conversion applies.

---

## 2. Progression Logic

Identical thresholds to dictation, applied separately against maths fields:

| Threshold | Value |
|---|---|
| HIGH_THRESHOLD | 80% (≥12/15 correct) |
| LOW_THRESHOLD | 50% (<8/15 correct) |
| CONSECUTIVE_NEEDED | 3 sessions |

`evaluateProgression` is reused. `saveMathsSession` calls it with `mathsLevel`, `mathsConsecutiveHighScores`, `mathsConsecutiveLowScores` and writes results back to the child document.

---

## 3. Cloud Functions

Both deployed to `europe-west2`. Reuse `ANTHROPIC_API_KEY` secret. Same markdown fence stripping and JSON parse pattern as existing functions.

### `generateMathsQuestions({ level: Level })`
Returns `{ questions: MathsQuestion[] }` — exactly 15 questions.

Prompt requirements:
- St Paul's Juniors 7+ calibration at the given level
- Questions ordered easiest → hardest: Q1–5 straightforward arithmetic, Q6–10 tables/fractions/money/time, Q11–15 multi-step word problems and reasoning
- No more than 4 questions of any single category
- Questions phrased as an invigilator would read them aloud (e.g. "What is six multiplied by seven?" not "6×7=")
- Expected answer always includes units where applicable (money → p or £, length → cm or m, time → HH:MM or words)
- Returns JSON array of `MathsQuestion`

### `markMathsSession({ questions: MathsQuestion[], childAnswers: string[] })`
Returns `{ results: MathsQuestionResult[], totalScore: number }`.

Prompt requirements:
- Mark all 15 question/expected/childAnswer triples in one call
- Unit equivalence: `45p` = `£0.45` (both correct); bare `45` for a money answer = incorrect
- Time equivalence: `3:15` = `quarter past 3` (both correct)
- Correct number but wrong unit = incorrect, feedback explains why
- For incorrect answers: short, child-friendly feedback string
- `totalScore` = percentage correct rounded to nearest integer
- Returns JSON

---

## 4. Frontend — Routing

New routes added to `App.tsx`:

```
/child/:childId              — module select screen (new)
/maths-start/:childId        — confirm level, begin session
/maths-play/:childId         — TTS playback of 15 questions
/maths-entry/:childId        — parent enters all 15 answers
/maths-results/:childId      — per-question results + category breakdown
/maths-dashboard/:childId    — maths progress charts + session history
```

Existing dictation routes (`/session-start`, `/dictation`, `/results`, `/dashboard`) are unchanged; they are now reached via the module select screen.

---

## 5. Frontend — Pages

### Home (`/`)
- Subtitle changes from "SPJ 7+ Dictation Practice" → "SPJ 7+ Practice"
- `ChildCard` shows child name + a single "Select" button (navigates to `/child/:childId`)
- Delete child button added to ChildCard with confirmation dialog

### Module Select (`/child/:childId`)
Two side-by-side module cards:

**Dictation**
- Shows current dictation `level`
- "Start Session" → `/session-start/:childId`
- "View Progress" → `/dashboard/:childId`

**Mental Maths**
- Shows current `mathsLevel`
- "Start Session" → `/maths-start/:childId`
- "View Progress" → `/maths-dashboard/:childId`

Back button → Home.

### Maths Start (`/maths-start/:childId`)
Confirms the child's current `mathsLevel`. "Begin Session" button navigates to `/maths-play/:childId`, passing questions via React Router state (generated on this screen to avoid regenerating on navigation).

### Maths Play (`/maths-play/:childId`)
Reads all 15 questions aloud. Per-question cycle:
1. TTS reads question (once)
2. 5-second pause
3. TTS reads question again
4. 15-second countdown (child writes answer on paper)
5. Auto-advance

UI shows: question number / progress bar / countdown timer. A "Pause" button halts the cycle between questions. No answer input on this screen.

After Q15 completes, navigates automatically to `/maths-entry/:childId`.

Reuses: `useTTS`, `useCountdown`, `CountdownTimer`.

### Maths Entry (`/maths-entry/:childId`)
Scrollable list of all 15 questions (read-only) with a text input beside each. Parent types the child's written answers.

"Submit Answers" button (disabled until all 15 filled) calls `markMathsSession`, shows loading state, then navigates to `/maths-results/:childId` with results in router state.

### Maths Results (`/maths-results/:childId`)
- Headline: "11 / 15 correct (73%)"
- Score badge coloured green/amber/red by threshold
- Per-question breakdown: question text, child's answer, ✅/❌, feedback line
- Category summary table: category name + correct/total for that category
- Saves session to Firestore and updates child progression on mount
- "View Progress" and "Back to Home" buttons

### Maths Dashboard (`/maths-dashboard/:childId`)
Mirrors dictation Dashboard structure:

- Stats bar: sessions to level up / sessions to level down / total sessions (maths-specific counters)
- Score trend line chart: last 10 sessions
- Errors by category chart: 10 lines, one per `MathsCategory`, showing count of incorrect answers per session
- Session history: expandable rows, each showing all 15 Q&A pairs with ✅/❌ and feedback

---

## 6. Modified Existing Files

| File | Change |
|---|---|
| `src/types.ts` | Add `MathsCategory`, `MathsQuestion`, `MathsQuestionResult`, `MathsSession`; extend `Child` |
| `src/api/children.ts` | `addChild` initialises maths fields; add `saveMathsSession`, `getMathsSessions`; add `deleteChild` (cascading delete of sessions + mathsSessions subcollections) |
| `src/api/functions.ts` | Add `generateMathsQuestions`, `markMathsSession` wrappers |
| `src/App.tsx` | Add new routes |
| `src/pages/Home.tsx` | Subtitle change; ChildCard now navigates to `/child/:childId`; delete child |
| `src/components/ChildCard.tsx` | Single "Select" button + delete button with confirmation |
| `functions/src/index.ts` | Export two new functions |

---

## 7. Delete Child

- Confirmation dialog: "Delete [name]? All sessions will be permanently deleted. This cannot be undone."
- Client-side cascading delete: fetch and delete all `sessions` docs, then all `mathsSessions` docs, then the child document
- Removes child from UI list immediately after

---

## 8. Testing

New unit tests following existing patterns:

- `evaluateProgression` with maths fields (same logic, different field names — confirm no cross-contamination)
- `saveMathsSession` / `getMathsSessions` (mock Firestore, same pattern as existing `children.test.ts`)
- `generateMathsQuestions` / `markMathsSession` API wrappers (mock `httpsCallable`)
- `MathsPlay` phase transitions (mock `useTTS` and `useCountdown`)

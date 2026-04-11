# Verbal Reasoning Module — Design Spec
**Date:** 2026-04-11
**Branch:** feature/verbal-reasoning
**Target:** St Paul's Juniors (Colet Court) 7+ entrance exam preparation

---

## Overview

A third practice module alongside Dictation and Mental Maths. The parent selects a difficulty level and paper length, the app generates a printable verbal reasoning paper, the child completes it on paper, and the parent enters answers on screen for marking. Progress is tracked per child with the same progression logic as the other modules.

Additionally, all three module start screens are updated to show the recommended level (from progression tracking) but allow the parent to override it via a level selector.

---

## 1. Data Model

### Child — new fields

Three new fields added to the existing `Child` type:

```typescript
verbalLevel: Level                   // 'Beginner' | 'Developing' | 'Confident' | 'Stretch'
verbalConsecutiveHighScores: number
verbalConsecutiveLowScores: number
```

`addChild` initialises all three to `'Beginner'` / `0` / `0`.

### New types

```typescript
type VerbalQuestionType =
  | 'synonym'
  | 'odd_word_out'
  | 'analogy'
  | 'word_code'
  | 'hidden_word'
  | 'letter_sequence'

interface VerbalQuestion {
  number: number
  type: VerbalQuestionType
  question: string
  options?: string[]    // present for synonym and odd_word_out only
  answer: string
  explanation: string
}

interface VerbalQuestionResult {
  question: string
  type: VerbalQuestionType
  options?: string[]
  childAnswer: string
  correct: boolean
  correctAnswer: string
  explanation: string
}

interface VerbalSession {
  id: string
  date: string          // ISO timestamp
  level: Level
  paperLength: number
  totalScore: number    // 0–100 (percentage correct, rounded)
  questions: VerbalQuestionResult[]
}
```

### Firestore

New subcollection: `children/{id}/verbalSessions/{id}`

Same Timestamp → ISO conversion pattern as `sessions` and `mathsSessions`.

---

## 2. Progression Logic

Identical thresholds to dictation and maths, applied separately against verbal fields:

| Threshold | Value |
|---|---|
| HIGH_THRESHOLD | 80% |
| LOW_THRESHOLD | 50% |
| CONSECUTIVE_NEEDED | 3 sessions |

`evaluateProgression` is reused with a pseudo-child mapping `verbalLevel → level`, etc. `saveVerbalSession` writes results to Firestore and updates child progression fields.

### Level selector on all start screens

All three module start screens (dictation `SessionStart`, maths `MathsStart`, and new `VerbalStart`) show a level selector. The selector is pre-populated with the child's current tracked level for that module (`level`, `mathsLevel`, `verbalLevel`) as the recommended value, but the parent can change it before starting. The selected level is passed to the Cloud Function and saved with the session.

---

## 3. Cloud Function

### `generateVerbalQuestions({ level: Level, paperLength: 10 | 20 | 30 })`

Returns `{ questions: VerbalQuestion[] }` — exactly `paperLength` questions.

Deployed to `europe-west2`. Uses `claude-opus-4-5` (richer vocabulary judgment required). Reuses `ANTHROPIC_API_KEY` secret. Same markdown fence stripping and JSON parse pattern as existing functions.

**Prompt requirements:**
- Mix all 6 question types evenly across the paper (e.g. 30 questions = 5 of each type; remainder distributed evenly)
- Order questions easiest → hardest within the paper
- Difficulty calibration per level:
  - Beginner: standard 7+ level, straightforward vocabulary, simple relationships
  - Developing: SPJ level, richer vocabulary, moderate inference
  - Confident: SPJ stretch, abstract relationships, challenging vocabulary
  - Stretch: exam-level, vocabulary a gifted 6-year-old working at 7–9 year level would find challenging but achievable
- Question type specifications:
  - **Synonym**: "Which word means the same as ANCIENT? Circle one: old / new / modern / young" — 4 options, one correct
  - **Odd word out**: 5 words, one doesn't belong — reason requires genuine reasoning, not obvious categories
  - **Analogy**: "Conductor is to orchestra as captain is to ___" — child writes answer
  - **Word code**: number codes (A=1) at Beginner; letter shift codes at Confident/Stretch
  - **Hidden word**: real word hidden across two adjacent words in a sentence — child writes the word
  - **Letter sequence**: child writes the next letter — simple gaps at Beginner, variable gaps at Stretch
- Never repeat question patterns or reuse the same words
- All answers unambiguously correct

**Validation:**
- Array length must equal `paperLength`
- Each object must have: `number` (number), `type` (valid VerbalQuestionType), `question` (string), `answer` (string), `explanation` (string)
- `options` must be present and have length ≥ 4 for `synonym` and `odd_word_out`
- Outer try/catch around Anthropic API call

**Marking:** Client-side only — no marking Cloud Function needed. For all types: `correct = childAnswer.trim().toLowerCase() === question.answer.trim().toLowerCase()`. `totalScore` = percentage correct rounded to nearest integer.

---

## 4. Frontend — Routing

New routes added to `App.tsx`:

```
/verbal-start/:childId     — level + paper length selector, generates questions
/verbal-paper/:childId     — printable paper view
/verbal-entry/:childId     — answer entry
/verbal-results/:childId   — per-question results
/verbal-dashboard/:childId — progress charts + session history
```

---

## 5. Frontend — Pages

### Module Select (`/child/:childId`)
Third module card added:

**Verbal Reasoning**
- Shows current `verbalLevel`
- "Start Session" → `/verbal-start/:childId`
- "View Progress" → `/verbal-dashboard/:childId`

### Verbal Start (`/verbal-start/:childId`)
- Level selector (4 options): pre-populated with `child.verbalLevel ?? 'Beginner'` as recommended, labelled "Recommended"
- Paper length selector: Short (10) / Standard (20) / Full Mock (30) — default Standard
- "Generate Paper" button — shows loading state while Cloud Function runs
- On success: navigates to `/verbal-paper/:childId` with `{ questions, level, paperLength }` in router state
- Error display if generation fails
- Back button → `/child/:childId`

### SessionStart (existing, modified)
- Add level selector pre-populated with `child.level ?? 'Beginner'`
- Selected level passed to `generateSentences` and saved with session

### MathsStart (existing, modified)
- Add level selector pre-populated with `child.mathsLevel ?? 'Beginner'`
- Selected level passed to `generateMathsQuestions` and saved with session

### Verbal Paper (`/verbal-paper/:childId`)
Printable exam paper. Two sections separated by a CSS page break.

**Question Paper section:**
- Header: "St Paul's Juniors 7+ Verbal Reasoning Practice Paper"
- Fields: Name: _______________ / Date: _______________ / Score: ___/___
- Subheader: level name + number of questions
- Per question: number, question text, options (for synonym/odd_word_out: spaced horizontally with a circle) or answer line (for written types)
- Clean exam formatting: no colours, serif font (Georgia), generous spacing
- Numeric question count display (e.g. "Question 1 of 20")

**Answer Sheet section (parent copy):**
- Header: "Answer Sheet — Parent Copy"
- Table: Question Number / Correct Answer / Explanation
- One row per question

**Print behaviour:**
- `window.print()` on "Print Paper" button
- `@media print`: hide `.no-print` elements (buttons, nav), show only `.print-content`
- CSS `page-break-before: always` before the Answer Sheet section

**Screen buttons (`.no-print`):**
- "Print Paper" — triggers `window.print()`
- "Start Answering" — navigates to `/verbal-entry/:childId` with questions in router state
- Back button → `/verbal-start/:childId`

### Verbal Entry (`/verbal-entry/:childId`)
Scrollable list of all questions.

- **synonym / odd_word_out**: clickable option buttons (one selectable at a time, selected option highlighted in blue)
- **analogy / word_code / hidden_word / letter_sequence**: text input field

"Submit Answers" button disabled until all questions answered. Calls client-side marking on submit, navigates to `/verbal-results/:childId` with `{ results, totalScore, level, paperLength }` in router state.

### Verbal Results (`/verbal-results/:childId`)
- Headline: "18 / 20 correct (90%)" — single line, coloured green/amber/red
- Per-question breakdown: question text, child's answer, ✅/❌, correct answer + explanation for wrong answers
- Category summary table: question type + correct/total for that type
- Saves session to Firestore on mount (useRef guard against Strict Mode double-save)
- "View Progress" → `/verbal-dashboard/:childId` and "Back to Home" → `/` buttons

### Verbal Dashboard (`/verbal-dashboard/:childId`)
Mirrors MathsDashboard structure:

- Stats bar: sessions to level up / sessions to level down / total sessions (verbal-specific counters)
- Score trend line chart: last 10 sessions
- Errors by type chart: 6 lines, one per `VerbalQuestionType`, showing incorrect count per session
- Session history: expandable rows showing all Q&A pairs with ✅/❌, correct answer and explanation

Back button → `/child/:childId`

---

## 6. Modified Existing Files

| File | Change |
|---|---|
| `src/types.ts` | Add `VerbalQuestionType`, `VerbalQuestion`, `VerbalQuestionResult`, `VerbalSession`; extend `Child` with 3 verbal fields |
| `src/api/children.ts` | `addChild` initialises verbal fields; add `saveVerbalSession`, `getVerbalSessions` |
| `src/api/functions.ts` | Add `generateVerbalQuestions` wrapper |
| `src/App.tsx` | Add 5 new routes |
| `src/pages/ModuleSelect.tsx` | Add third Verbal Reasoning module card |
| `src/pages/SessionStart.tsx` | Add level selector |
| `src/pages/MathsStart.tsx` | Add level selector |
| `functions/src/index.ts` | Export new function |

---

## 7. Testing

New unit tests following existing patterns:

- `evaluateProgression` with verbal pseudo-child fields (confirm no cross-contamination with dictation/maths fields)
- `saveVerbalSession` / `getVerbalSessions` (mock Firestore, same pattern as existing tests)
- `generateVerbalQuestions` API wrapper (mock `httpsCallable`)
- Client-side marking logic: correct/incorrect for each question type, case-insensitive match, totalScore calculation
- `VerbalEntry` answer state: multiple choice selection, text input, submit disabled until all filled

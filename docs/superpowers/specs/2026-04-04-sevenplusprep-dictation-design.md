# SevenPlusPrep — Dictation Module Design

**Date:** 2026-04-04
**Scope:** Dictation module only (verbal reasoning is a future phase)

---

## Overview

A React web app to help a child practise for the St Paul's Juniors (SPJ) 7+ entrance exam dictation test. A parent supervises each session: the app reads sentences aloud three times via text-to-speech, the child writes on paper, then the parent types the child's answer for AI-powered marking and error tracking.

---

## Background: SPJ Dictation Format

Based on research from tutoring sources:

- **3 sentences** per session
- Each sentence read **3 times**: listen → write → check
- Sentence length: **15–25 words** (longer at higher levels)
- Assessed areas: spelling, homophones (there/their/they're etc.), punctuation (capitals, commas, speech marks, exclamation marks, question marks), contractions (it's, wouldn't etc.), sentence structure
- Advanced vocabulary may appear but is not expected to be spelled perfectly

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript (Vite) |
| Hosting | Firebase Hosting |
| Backend | Firebase Cloud Functions (TypeScript) |
| Database | Firestore |
| AI | Anthropic Claude API (sentence generation + marking) |
| TTS | Browser Web Speech API |

---

## Architecture

```
Browser (React SPA)
    ↓ HTTPS
Firebase Cloud Functions
    ├── generateSentences(childId, level) → Claude API
    ├── markAnswer(correct, childAnswer) → Claude API
    └── saveSession(childId, results) → Firestore
Firestore
    └── children/{childId}/sessions/{sessionId}
```

No authentication required — single-family app, accessible to any parent on any device via shared URL.

---

## Difficulty Levels

| Level | Description |
|---|---|
| Beginner | Simple sentences, common words, basic punctuation (capital letters, full stops) |
| Developing | More complex sentences, some homophones, apostrophes introduced |
| Confident | Harder vocabulary, multiple punctuation types, contractions |
| Stretch | SPJ exam level — sophisticated vocabulary, multiple challenge types per sentence |

**Progression rules:**
- Level up after **3 consecutive sessions at 80%+ score**
- Level down after **3 consecutive sessions below 50% score**
- Otherwise level stays the same
- Thresholds are configurable and can be adjusted as needed

---

## Data Model (Firestore)

```
children/{childId}
  ├── name: string
  ├── createdAt: timestamp
  ├── level: "Beginner" | "Developing" | "Confident" | "Stretch"
  ├── consecutiveHighScores: number   // towards level up
  ├── consecutiveLowScores: number    // towards level down
  └── sessions/{sessionId}
        ├── date: timestamp
        ├── level: string             // level at time of session
        ├── totalScore: number        // 0-100
        └── sentences: array
              ├── correct: string     // AI-generated sentence
              ├── childAnswer: string // typed by parent
              ├── score: number       // 0-100
              └── errors: array
                    └── { type: "homophone" | "punctuation" | "contraction" | "spelling", word: string, correction: string }
```

---

## Session Flow

1. **Parent selects child profile** on home screen
2. **Session start screen** shows child name, current level, "Begin Session" button
3. **For each of 3 sentences:**
   a. App displays sentence number (e.g. "Sentence 1 of 3")
   b. **Read 1** — TTS plays sentence at normal speed (child listens)
   c. **15-second countdown** — child begins writing on paper
   d. **Read 2** — TTS plays sentence again (child writes)
   e. **15-second countdown**
   f. **Read 3** — TTS plays sentence a final time (child checks)
   g. **10-second countdown**
   h. Text box appears — parent types what child wrote
   i. "Mark Answer" → Claude API compares answers, returns errors by category
   j. Error breakdown shown for that sentence
   k. "Next Sentence" button
4. **Session results screen** — overall score, error breakdown, all sentences with errors highlighted
5. **Level progression** evaluated — consecutive score counters updated in Firestore

---

## Screens

### 1. Home Screen
- Child profile cards showing name + current level badge
- "Add Child" button
- "View Progress" link per child (→ parent dashboard)

### 2. Session Start
- Child name + level displayed (e.g. "James — Developing")
- Brief description: "3 sentences, read aloud 3 times each"
- "Begin Session" button

### 3. Dictation Screen (per sentence)
- Sentence number indicator (1 of 3)
- Large Play button → triggers read 1
- Large countdown timer (visible digits) between reads
- After read 3: text input appears for parent to enter child's answer
- "Mark Answer" button
- Inline error breakdown per sentence (errors highlighted by category)
- "Next Sentence" / "See Results" button

### 4. Session Results
- Overall score (e.g. 73%)
- Error breakdown table: Homophones | Punctuation | Contractions | Spelling
- Each sentence shown with child's answer, errors highlighted and labelled
- "Back to Home" button

### 5. Parent Dashboard
- Child selector
- Score trend chart (last 10 sessions)
- Error category breakdown over time (which areas need most work)
- Current level + consecutive session counters (e.g. "2 of 3 strong sessions for next level")

---

## AI Integration

### Sentence Generation (Cloud Function)
Claude is prompted to generate 3 sentences targeting:
- The child's current difficulty level
- 15–25 words per sentence (longer at higher levels)
- A mix of challenge types: homophones, contractions, punctuation, spelling
- Age-appropriate vocabulary (6–7 year old comprehension)
- No sentence repeats within a session

### Answer Marking (Cloud Function)
Claude compares the correct sentence to the child's answer and returns:
- Overall score (0–100)
- Array of errors with type, incorrect word, and correct word
- Ignores minor whitespace differences
- Distinguishes wrong homophone (error) from misspelling of non-homophone (separate category)

---

## Error Categories

| Category | Example |
|---|---|
| Homophone | "their" written as "there" |
| Punctuation | Missing comma, wrong capitalisation, missing apostrophe in possessive |
| Contraction | "its" written instead of "it's" |
| Spelling | "freind" instead of "friend" |

---

## Out of Scope (This Phase)
- Verbal reasoning module
- User authentication / multiple parent accounts
- Offline support
- Native mobile app (browser-based is sufficient)

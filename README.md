# 7+ Prep

A web app to help children practise for the 7+ exam through AI-generated dictation exercises.

## What it does

- Create profiles for children with adaptive difficulty levels (Beginner → Developing → Confident → Stretch)
- Generate dictation sentences via AI, read aloud using text-to-speech
- Children type their answers; the app marks them and identifies error types (spelling, homophones, punctuation, contractions)
- Track progress over time with a session history dashboard and score charts
- Automatically promotes or demotes difficulty based on consecutive high/low scores

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Routing | React Router v6 |
| Charts | Recharts |
| Backend | Firebase (Firestore, Cloud Functions) |
| AI | Claude API (sentence generation, answer marking) |
| TTS | Web Speech API |

## Getting started

### Prerequisites

- Node.js 18+
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project with Firestore enabled

### Install

```bash
npm install
cd functions && npm install && cd ..
```

### Configure

Copy `.env.example` to `.env.local` and fill in your Firebase config:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
```

Set the Claude API key for Cloud Functions:

```bash
firebase functions:secrets:set ANTHROPIC_API_KEY
```

### Run locally

```bash
# Start the frontend
npm run dev

# In another terminal, start Firebase emulators
firebase emulators:start
```

### Run tests

```bash
npm test
```

### Deploy

```bash
npm run build
firebase deploy
```

## Project structure

```
src/
  pages/        # Route-level components (Home, SessionStart, Dictation, Results, Dashboard)
  components/   # Reusable UI components
  api/          # Firestore data access (children, functions)
  hooks/        # useCountdown, useTTS
  types.ts      # Shared TypeScript types
functions/      # Firebase Cloud Functions
  generateSentences.ts
  markAnswer.ts
  generateAudio.ts
```

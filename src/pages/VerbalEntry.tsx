// src/pages/VerbalEntry.tsx
import { useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import type { VerbalQuestion, VerbalQuestionResult, Level } from '../types'

interface LocationState {
  questions: VerbalQuestion[]
  level: Level
  paperLength: number
}

export function markAnswers(questions: VerbalQuestion[], childAnswers: string[]): { results: VerbalQuestionResult[]; totalScore: number } {
  const results: VerbalQuestionResult[] = questions.map((q, i) => {
    const childAnswer = childAnswers[i] ?? ''
    const correct = childAnswer.trim().toLowerCase() === q.answer.trim().toLowerCase()
    return {
      question: q.question,
      type: q.type,
      options: q.options,
      childAnswer,
      correct,
      correctAnswer: q.answer,
      explanation: q.explanation,
    }
  })
  const correctCount = results.filter(r => r.correct).length
  const totalScore = Math.round((correctCount / results.length) * 100)
  return { results, totalScore }
}

export function VerbalEntry() {
  const { childId } = useParams<{ childId: string }>()
  const navigate = useNavigate()
  const { state } = useLocation() as { state: LocationState }
  const { questions, level, paperLength } = state || {}

  const [answers, setAnswers] = useState<string[]>(() => Array(questions?.length || 20).fill(''))

  if (!questions) return <div style={{ textAlign: 'center', padding: 48 }}>No paper data — go back and generate a paper.</div>

  const allAnswered = answers.every(a => a.trim() !== '')

  function handleSubmit() {
    const { results, totalScore } = markAnswers(questions, answers)
    navigate(`/verbal-results/${childId}`, { state: { results, totalScore, level, paperLength } })
  }

  function setAnswer(index: number, value: string) {
    setAnswers(prev => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  return (
    <div style={{ maxWidth: 640, margin: '40px auto', padding: 24 }}>
      <button
        type="button"
        onClick={() => navigate(`/verbal-paper/${childId}`, { state: { questions, level, paperLength } })}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6c757d', fontSize: 16, marginBottom: 24 }}
      >
        ← Back to Paper
      </button>

      <h1 style={{ marginBottom: 4 }}>Enter Answers</h1>
      <p style={{ color: '#6c757d', marginBottom: 32 }}>
        {questions.length} questions · {level}
      </p>

      {questions.map((q, i) => (
        <div key={q.number} style={{ border: '1px solid #dee2e6', borderRadius: 8, padding: 16, marginBottom: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 15 }}>
            <span style={{ color: '#6c757d', marginRight: 8, fontSize: 13 }}>Q{q.number}</span>
            {q.question}
          </div>

          {q.type === 'synonym' || q.type === 'odd_word_out' ? (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {(q.options ?? []).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setAnswer(i, opt)}
                  style={{
                    padding: '8px 16px', cursor: 'pointer', borderRadius: 8, fontSize: 15,
                    border: answers[i] === opt ? '2px solid #0d6efd' : '1px solid #dee2e6',
                    background: answers[i] === opt ? '#e7f1ff' : 'white',
                    fontWeight: answers[i] === opt ? 600 : 400,
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <input
              type="text"
              value={answers[i]}
              onChange={e => setAnswer(i, e.target.value)}
              placeholder="Your answer..."
              style={{ width: '100%', padding: '10px 12px', fontSize: 16, borderRadius: 8, border: '1px solid #dee2e6', boxSizing: 'border-box' }}
            />
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!allAnswered}
        style={{
          width: '100%', padding: '16px', fontSize: 18, fontWeight: 600, borderRadius: 12, border: 'none', marginTop: 16,
          background: allAnswered ? '#0d6efd' : '#e9ecef',
          color: allAnswered ? 'white' : '#6c757d',
          cursor: allAnswered ? 'pointer' : 'not-allowed',
        }}
      >
        Submit Answers
      </button>
    </div>
  )
}

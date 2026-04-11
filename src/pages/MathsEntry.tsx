import { useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { markMathsSession } from '../api/functions'
import type { Level, MathsQuestion } from '../types'

interface LocationState {
  questions: MathsQuestion[]
  level: Level
}

export function MathsEntry() {
  const { childId } = useParams<{ childId: string }>()
  const navigate = useNavigate()
  const { state } = useLocation() as { state: LocationState }

  const questions: MathsQuestion[] = state?.questions ?? []
  const [answers, setAnswers] = useState<string[]>(() => Array(questions.length || 15).fill(''))
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
      navigate(`/maths-results/${childId}`, { state: { results, totalScore, level: state?.level } })
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
        type="button"
        onClick={handleSubmit}
        disabled={!allFilled || submitting}
        style={{
          width: '100%', padding: '16px', fontSize: 18,
          cursor: allFilled && !submitting ? 'pointer' : 'not-allowed',
          background: allFilled ? '#198754' : '#6c757d',
          color: 'white', border: 'none', borderRadius: 8, fontWeight: 600,
        }}
      >
        {submitting ? 'Marking...' : 'Submit Answers'}
      </button>
    </div>
  )
}

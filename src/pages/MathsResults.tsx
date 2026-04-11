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
      <div style={{ textAlign: 'center', fontSize: 40, fontWeight: 700, color: scoreColour, marginBottom: 32 }}>
        {correctCount} / 15 correct ({totalScore}%)
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

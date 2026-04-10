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

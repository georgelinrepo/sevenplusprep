// src/pages/VerbalResults.tsx
import { useEffect, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { getChildren, saveVerbalSession } from '../api/children'
import type { VerbalQuestionResult, VerbalQuestionType, Level } from '../types'

interface LocationState {
  results: VerbalQuestionResult[]
  totalScore: number
  level: Level
  paperLength: number
}

const TYPE_LABELS: Record<VerbalQuestionType, string> = {
  synonym: 'Synonyms',
  odd_word_out: 'Odd Word Out',
  analogy: 'Analogies',
  word_code: 'Word Codes',
  compound_word: 'Compound Words',
  letter_sequence: 'Letter Sequences',
}

export function VerbalResults() {
  const { childId } = useParams<{ childId: string }>()
  const navigate = useNavigate()
  const { state } = useLocation() as { state: LocationState }
  const { results, totalScore, level, paperLength } = state || {}
  const saved = useRef(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // All values come from immutable navigation state — fire once only
    if (saved.current || !childId || !results) return
    saved.current = true
    getChildren().then(children => {
      const child = children.find(c => c.id === childId)
      if (!child) return
      saveVerbalSession(child, {
        date: new Date().toISOString(),
        level: level ?? child.verbalLevel ?? 'Beginner',
        paperLength: paperLength ?? results.length,
        totalScore,
        questions: results,
      }).then(() => {
        console.log('VerbalResults: session saved')
      }).catch(e => {
        console.error('VerbalResults: failed to save session', e)
      })
    })
  }, [])

  if (!results) return <div style={{ textAlign: 'center', padding: 48 }}>No session data.</div>

  const correctCount = results.filter(r => r.correct).length
  const scoreColour = totalScore >= 80 ? '#198754' : totalScore >= 50 ? '#fd7e14' : '#dc3545'

  const typeMap: Record<string, { correct: number; total: number }> = {}
  for (const r of results) {
    if (!typeMap[r.type]) typeMap[r.type] = { correct: 0, total: 0 }
    typeMap[r.type].total++
    if (r.correct) typeMap[r.type].correct++
  }

  return (
    <div style={{ maxWidth: 640, margin: '40px auto', padding: 24 }}>
      <h1 style={{ textAlign: 'center', marginBottom: 4 }}>Session Complete</h1>
      <div style={{ textAlign: 'center', fontSize: 40, fontWeight: 700, color: scoreColour, marginBottom: 32 }}>
        {correctCount} / {results.length} correct ({totalScore}%)
      </div>

      <h3>By Question Type</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 32 }}>
        <thead>
          <tr style={{ background: '#f8f9fa' }}>
            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Type</th>
            <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>Score</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(typeMap).map(([type, { correct, total }]) => (
            <tr key={type} style={{ borderBottom: '1px solid #dee2e6' }}>
              <td style={{ padding: '8px 12px' }}>{TYPE_LABELS[type as VerbalQuestionType] ?? type}</td>
              <td style={{ padding: '8px 12px', textAlign: 'center' }}>{correct}/{total}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Question Breakdown</h3>
      {results.map((r, i) => (
        <div key={i} style={{ border: '1px solid #dee2e6', borderRadius: 8, padding: 16, marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
            <span style={{ fontWeight: 600, color: '#6c757d', fontSize: 13 }}>Q{i + 1} · {TYPE_LABELS[r.type] ?? r.type}</span>
            <span style={{ fontSize: 20 }}>{r.correct ? '✅' : '❌'}</span>
          </div>
          <div style={{ marginBottom: 4 }}>{r.question}</div>
          <div style={{ fontSize: 14, color: '#6c757d' }}>
            Answered: <strong>{r.childAnswer || '—'}</strong>
            {!r.correct && <> · Correct: <strong>{r.correctAnswer}</strong></>}
          </div>
          {!r.correct && r.explanation && (
            <div style={{ marginTop: 6, fontSize: 13, color: '#dc3545' }}>{r.explanation}</div>
          )}
        </div>
      ))}

      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <button
          type="button"
          onClick={() => navigate('/')}
          style={{ flex: 1, padding: '14px', fontSize: 16, cursor: 'pointer', background: '#0d6efd', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600 }}
        >
          Back to Home
        </button>
        <button
          type="button"
          onClick={() => navigate(`/verbal-dashboard/${childId}`)}
          style={{ flex: 1, padding: '14px', fontSize: 16, cursor: 'pointer', background: 'transparent', border: '1px solid #dee2e6', borderRadius: 8 }}
        >
          View Progress
        </button>
      </div>
    </div>
  )
}

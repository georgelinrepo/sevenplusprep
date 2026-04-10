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

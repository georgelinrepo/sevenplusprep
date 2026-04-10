// src/components/ErrorBreakdownTable.tsx
import type { SentenceResult, ErrorType } from '../types'

const ERROR_TYPES: ErrorType[] = ['homophone', 'punctuation', 'contraction', 'spelling']

interface Props {
  sentences: SentenceResult[]
}

export function ErrorBreakdownTable({ sentences }: Props) {
  const counts: Record<ErrorType, number> = { homophone: 0, punctuation: 0, contraction: 0, spelling: 0 }
  for (const s of sentences) {
    for (const e of s.errors) {
      counts[e.type] = (counts[e.type] || 0) + 1
    }
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
      <thead>
        <tr>
          {ERROR_TYPES.map(t => (
            <th key={t} style={{ padding: '8px 16px', background: '#f8f9fa', border: '1px solid #dee2e6', textTransform: 'capitalize' }}>{t}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          {ERROR_TYPES.map(t => (
            <td key={t} style={{ padding: '8px 16px', textAlign: 'center', border: '1px solid #dee2e6', fontWeight: 600, color: counts[t] > 0 ? '#dc3545' : '#198754' }}>
              {counts[t]}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  )
}

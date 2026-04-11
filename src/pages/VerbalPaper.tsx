// src/pages/VerbalPaper.tsx
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import type { VerbalQuestion, Level } from '../types'

interface LocationState {
  questions: VerbalQuestion[]
  level: Level
  paperLength: number
}

const TYPE_LABELS: Record<string, string> = {
  synonym: 'Synonyms',
  odd_word_out: 'Odd Word Out',
  analogy: 'Analogies',
  word_code: 'Word Codes',
  compound_word: 'Compound Words',
  letter_sequence: 'Letter Sequences',
}

export function VerbalPaper() {
  const { childId } = useParams<{ childId: string }>()
  const navigate = useNavigate()
  const { state } = useLocation() as { state: LocationState }
  const { questions, level, paperLength } = state || {}

  if (!questions) return <div style={{ textAlign: 'center', padding: 48 }}>No paper data — go back and generate a paper.</div>

  const hasOptions = (q: VerbalQuestion) => q.type === 'synonym' || q.type === 'odd_word_out'

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          .print-content { display: block !important; }
          .page-break { page-break-before: always; }
        }
        @media screen {
          .print-content { max-width: 700px; margin: 0 auto; padding: 24px; }
        }
      `}</style>

      {/* Screen controls */}
      <div className="no-print" style={{ maxWidth: 700, margin: '0 auto', padding: '24px 24px 0' }}>
        <button
          type="button"
          onClick={() => navigate(`/verbal-start/${childId}`)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6c757d', fontSize: 16, marginBottom: 16 }}
        >
          ← Back
        </button>
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <button
            type="button"
            onClick={() => window.print()}
            style={{ padding: '12px 24px', fontSize: 16, cursor: 'pointer', background: '#198754', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600 }}
          >
            🖨 Print Paper
          </button>
          <button
            type="button"
            onClick={() => navigate(`/verbal-entry/${childId}`, { state: { questions, level, paperLength } })}
            style={{ padding: '12px 24px', fontSize: 16, cursor: 'pointer', background: '#0d6efd', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600 }}
          >
            Start Answering →
          </button>
        </div>
      </div>

      {/* Printable content */}
      <div className="print-content">
        {/* Question Paper */}
        <div style={{ fontFamily: 'Georgia, serif', lineHeight: 1.6 }}>
          <h1 style={{ textAlign: 'center', fontSize: 18, marginBottom: 4 }}>
            7+ School Entrance Exam — Verbal Reasoning Practice Paper
          </h1>
          <p style={{ textAlign: 'center', fontSize: 14, color: '#6c757d', marginBottom: 24 }}>
            {level} · {paperLength} questions
          </p>

          <div style={{ display: 'flex', gap: 32, marginBottom: 32, fontSize: 14 }}>
            <span>Name: {'_'.repeat(30)}</span>
            <span>Date: {'_'.repeat(20)}</span>
            <span>Score: ___ / {paperLength}</span>
          </div>

          {questions.map((q) => (
            <div key={q.number} style={{ marginBottom: 28, pageBreakInside: 'avoid' }}>
              <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 15 }}>
                {q.number}. {q.question}
              </div>
              {hasOptions(q) && q.options ? (
                <div style={{ display: 'flex', gap: 24, paddingLeft: 20, flexWrap: 'wrap' }}>
                  {q.options.map((opt, i) => (
                    <span key={i} style={{ fontSize: 14 }}>
                      ○ {opt}
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ paddingLeft: 20, borderBottom: '1px solid #999', marginLeft: 20, marginRight: 40, height: 28 }} />
              )}
            </div>
          ))}
        </div>

        {/* Answer Sheet — page break before */}
        <div className="page-break" style={{ fontFamily: 'Georgia, serif', paddingTop: 32 }}>
          <h2 style={{ textAlign: 'center', fontSize: 18, marginBottom: 4 }}>Answer Sheet — Parent Copy</h2>
          <p style={{ textAlign: 'center', fontSize: 13, color: '#6c757d', marginBottom: 20 }}>
            {level} · {paperLength} questions
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', border: '1px solid #dee2e6', width: 60 }}>Q</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', border: '1px solid #dee2e6', width: 120 }}>Type</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', border: '1px solid #dee2e6', width: 140 }}>Answer</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Explanation</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => (
                <tr key={q.number} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '6px 12px', border: '1px solid #dee2e6' }}>{q.number}</td>
                  <td style={{ padding: '6px 12px', border: '1px solid #dee2e6', fontSize: 12 }}>{TYPE_LABELS[q.type] ?? q.type}</td>
                  <td style={{ padding: '6px 12px', border: '1px solid #dee2e6', fontWeight: 600 }}>{q.answer}</td>
                  <td style={{ padding: '6px 12px', border: '1px solid #dee2e6' }}>{q.explanation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

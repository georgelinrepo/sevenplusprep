// src/pages/VerbalDashboard.tsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { getChildren, getVerbalSessions } from '../api/children'
import type { Child, VerbalSession, VerbalQuestionType } from '../types'

const TYPE_COLOURS: Record<VerbalQuestionType, string> = {
  synonym: '#0d6efd',
  odd_word_out: '#198754',
  analogy: '#dc3545',
  word_code: '#fd7e14',
  hidden_word: '#6f42c1',
  letter_sequence: '#20c997',
}

const QUESTION_TYPES: VerbalQuestionType[] = [
  'synonym', 'odd_word_out', 'analogy', 'word_code', 'hidden_word', 'letter_sequence',
]

const TYPE_LABELS: Record<VerbalQuestionType, string> = {
  synonym: 'Synonyms',
  odd_word_out: 'Odd Word Out',
  analogy: 'Analogies',
  word_code: 'Word Codes',
  hidden_word: 'Hidden Words',
  letter_sequence: 'Letter Sequences',
}

function SessionHistoryItem({ session, index }: { session: VerbalSession; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const date = new Date(session.date).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  const scoreColour = session.totalScore >= 80 ? '#198754' : session.totalScore >= 50 ? '#fd7e14' : '#dc3545'

  return (
    <div style={{ border: '1px solid #dee2e6', borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        style={{ width: '100%', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' }}
      >
        <span style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span style={{ fontWeight: 700, color: '#6c757d', minWidth: 32 }}>#{index}</span>
          <span style={{ fontSize: 14, color: '#6c757d' }}>{date}</span>
          <span style={{ fontSize: 13, background: '#f8f9fa', borderRadius: 12, padding: '2px 10px' }}>{session.level}</span>
          <span style={{ fontSize: 13, color: '#6c757d' }}>{session.paperLength}q</span>
        </span>
        <span style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span style={{ fontWeight: 700, color: scoreColour }}>{session.totalScore}%</span>
          <span style={{ color: '#6c757d' }}>{expanded ? '▲' : '▼'}</span>
        </span>
      </button>
      {expanded && (
        <div style={{ padding: '0 16px 16px' }}>
          {session.questions.map((q, i) => (
            <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0', fontSize: 14 }}>
              <span style={{ marginRight: 8 }}>{q.correct ? '✅' : '❌'}</span>
              <span style={{ color: '#6c757d', marginRight: 8 }}>Q{i + 1}</span>
              {q.question}
              <span style={{ color: '#6c757d', marginLeft: 8 }}>
                (answered: <strong>{q.childAnswer || '—'}</strong>
                {!q.correct && <> · correct: <strong>{q.correctAnswer}</strong></>})
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function VerbalDashboard() {
  const { childId } = useParams<{ childId: string }>()
  const navigate = useNavigate()
  const [child, setChild] = useState<Child | null>(null)
  const [sessions, setSessions] = useState<VerbalSession[]>([])

  useEffect(() => {
    if (!childId) return
    getChildren().then(children => {
      const found = children.find(c => c.id === childId)
      if (found) setChild(found)
    })
    getVerbalSessions(childId).then(setSessions)
  }, [childId])

  const recent = sessions.slice(-10)

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

  const sessionLabel = (s: VerbalSession, i: number) =>
    `#${sessions.length - recent.length + i + 1} (${formatDate(s.date)})`

  const scoreData = recent.map((s, i) => ({
    session: sessionLabel(s, i),
    score: s.totalScore,
  }))

  const errorData = recent.map((s, i) => {
    const counts: Record<string, number> = {}
    for (const t of QUESTION_TYPES) counts[t] = 0
    for (const q of s.questions) {
      if (!q.correct) counts[q.type] = (counts[q.type] || 0) + 1
    }
    return { session: sessionLabel(s, i), ...counts }
  })

  const toNextLevel = 3 - (child?.verbalConsecutiveHighScores ?? 0)
  const toDropLevel = 3 - (child?.verbalConsecutiveLowScores ?? 0)

  if (!child) return <div style={{ textAlign: 'center', padding: 48 }}>Loading...</div>

  const sortedSessions = [...sessions].reverse()

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', padding: 24 }}>
      <button
        type="button"
        onClick={() => navigate(`/child/${childId}`)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6c757d', fontSize: 16, marginBottom: 16 }}
      >
        ← Back
      </button>

      <h1>{child.name}'s Verbal Reasoning Progress</h1>
      <p>Current level: <strong>{child.verbalLevel ?? 'Beginner'}</strong></p>

      <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
        <div style={{ flex: 1, background: '#d1e7dd', borderRadius: 8, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{toNextLevel}</div>
          <div style={{ fontSize: 13, color: '#0f5132' }}>strong sessions to level up</div>
        </div>
        <div style={{ flex: 1, background: '#f8d7da', borderRadius: 8, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{toDropLevel}</div>
          <div style={{ fontSize: 13, color: '#842029' }}>weak sessions to level down</div>
        </div>
        <div style={{ flex: 1, background: '#f8f9fa', borderRadius: 8, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{sessions.length}</div>
          <div style={{ fontSize: 13, color: '#6c757d' }}>total sessions</div>
        </div>
      </div>

      {sessions.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#6c757d' }}>No sessions yet — complete a verbal reasoning session to see progress here.</p>
      ) : (
        <>
          <h3>Score Trend (last 10 sessions)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={scoreData}>
              <XAxis dataKey="session" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#0d6efd" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>

          <h3 style={{ marginTop: 32 }}>Errors by Question Type (last 10 sessions)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={errorData}>
              <XAxis dataKey="session" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend formatter={(value) => TYPE_LABELS[value as VerbalQuestionType] ?? value} />
              {QUESTION_TYPES.map(t => (
                <Line
                  key={t}
                  type="monotone"
                  dataKey={t}
                  stroke={TYPE_COLOURS[t]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>

          <h3 style={{ marginTop: 32 }}>Session History</h3>
          {sortedSessions.map((session, i) => (
            <SessionHistoryItem
              key={session.id}
              session={session}
              index={sessions.length - i}
            />
          ))}
        </>
      )}
    </div>
  )
}

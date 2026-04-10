// src/pages/Dashboard.tsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { getChildren, getSessions } from '../api/children'
import { SentenceResultCard } from '../components/SentenceResult'
import type { Child, Session } from '../types'

function SessionHistoryItem({ session, index }: { session: Session; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const date = new Date(session.date).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
  const scoreColour = session.totalScore >= 80 ? '#198754' : session.totalScore >= 50 ? '#fd7e14' : '#dc3545'

  return (
    <div style={{ border: '1px solid #dee2e6', borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{ width: '100%', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' }}
      >
        <span style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span style={{ fontWeight: 700, color: '#6c757d', minWidth: 32 }}>#{index}</span>
          <span style={{ fontSize: 14, color: '#6c757d' }}>{date}</span>
          <span style={{ fontSize: 13, background: '#f8f9fa', borderRadius: 12, padding: '2px 10px' }}>{session.level}</span>
        </span>
        <span style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span style={{ fontWeight: 700, color: scoreColour }}>{session.totalScore}%</span>
          <span style={{ color: '#6c757d' }}>{expanded ? '▲' : '▼'}</span>
        </span>
      </button>
      {expanded && (
        <div style={{ padding: '0 16px 16px' }}>
          {session.sentences.map((r, i) => (
            <SentenceResultCard key={i} result={r} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}

export function Dashboard() {
  const { childId } = useParams<{ childId: string }>()
  const navigate = useNavigate()
  const [child, setChild] = useState<Child | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])

  useEffect(() => {
    if (!childId) return
    getChildren().then(children => {
      const found = children.find(c => c.id === childId)
      if (found) setChild(found)
    })
    getSessions(childId).then(setSessions)
  }, [childId])

  const recent = sessions.slice(-10)

  const scoreData = recent.map((s, i) => ({
    session: `#${sessions.length - recent.length + i + 1}`,
    score: s.totalScore,
  }))

  const errorData = recent.map((s, i) => {
    const counts: Record<string, number> = { homophone: 0, punctuation: 0, contraction: 0, spelling: 0 }
    for (const sentence of s.sentences) {
      for (const e of sentence.errors) {
        counts[e.type] = (counts[e.type] || 0) + 1
      }
    }
    return { session: `#${sessions.length - recent.length + i + 1}`, ...counts }
  })

  const toNextLevel = 3 - (child?.consecutiveHighScores ?? 0)
  const toDropLevel = 3 - (child?.consecutiveLowScores ?? 0)

  if (!child) return <div style={{ textAlign: 'center', padding: 48 }}>Loading...</div>

  // Show sessions newest first
  const sortedSessions = [...sessions].reverse()

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', padding: 24 }}>
      <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6c757d', fontSize: 16, marginBottom: 16 }}>← Back</button>

      <h1>{child.name}'s Progress</h1>
      <p>Current level: <strong>{child.level}</strong></p>

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
        <p style={{ textAlign: 'center', color: '#6c757d' }}>No sessions yet — complete a dictation session to see progress here.</p>
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

          <h3 style={{ marginTop: 32 }}>Errors by Category (last 10 sessions)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={errorData}>
              <XAxis dataKey="session" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="homophone" stroke="#dc3545" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="punctuation" stroke="#fd7e14" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="contraction" stroke="#6f42c1" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="spelling" stroke="#0d6efd" strokeWidth={2} dot={{ r: 3 }} />
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

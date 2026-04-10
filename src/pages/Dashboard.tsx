// src/pages/Dashboard.tsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts'
import { getChildren, getSessions } from '../api/children'
import type { Child, Session } from '../types'

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
            <BarChart data={errorData}>
              <XAxis dataKey="session" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="homophone" fill="#dc3545" />
              <Bar dataKey="punctuation" fill="#fd7e14" />
              <Bar dataKey="contraction" fill="#6f42c1" />
              <Bar dataKey="spelling" fill="#0d6efd" />
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  )
}

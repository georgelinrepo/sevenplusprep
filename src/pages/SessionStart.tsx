// src/pages/SessionStart.tsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getChildren } from '../api/children'
import type { Child } from '../types'

export function SessionStart() {
  const { childId } = useParams<{ childId: string }>()
  const [child, setChild] = useState<Child | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    getChildren().then(children => {
      const found = children.find(c => c.id === childId)
      if (found) setChild(found)
    })
  }, [childId])

  if (!child) return <div style={{ textAlign: 'center', padding: 48 }}>Loading...</div>

  return (
    <div style={{ maxWidth: 500, margin: '80px auto', padding: 32, textAlign: 'center' }}>
      <h1>{child.name}</h1>
      <div style={{ fontSize: 20, color: '#6c757d', marginBottom: 8 }}>
        Current level: <strong>{child.level}</strong>
      </div>
      <p style={{ color: '#6c757d', marginBottom: 40 }}>
        3 sentences, each read aloud 3 times.<br />
        Write on paper, then check your work.
      </p>
      <button
        onClick={() => navigate(`/dictation/${child.id}`)}
        style={{ padding: '16px 40px', fontSize: 20, cursor: 'pointer', background: '#0d6efd', color: 'white', border: 'none', borderRadius: 12, fontWeight: 600 }}
      >
        Begin Session
      </button>
      <br />
      <button
        onClick={() => navigate('/')}
        style={{ marginTop: 16, padding: '10px 20px', cursor: 'pointer', background: 'transparent', border: 'none', color: '#6c757d', fontSize: 16 }}
      >
        ← Back
      </button>
    </div>
  )
}

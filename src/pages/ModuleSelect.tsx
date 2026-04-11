// src/pages/ModuleSelect.tsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getChildren } from '../api/children'
import type { Child } from '../types'

const LEVEL_COLOURS: Record<string, string> = {
  Beginner: '#6c757d',
  Developing: '#0d6efd',
  Confident: '#198754',
  Stretch: '#dc3545',
}

export function ModuleSelect() {
  const { childId } = useParams<{ childId: string }>()
  const [child, setChild] = useState<Child | null>(null)
  const [notFound, setNotFound] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    getChildren()
      .then(children => {
        const found = children.find(c => c.id === childId)
        if (found) setChild(found)
        else setNotFound(true)
      })
      .catch(() => setNotFound(true))
  }, [childId])

  if (notFound) return <div style={{ textAlign: 'center', padding: 48 }}>Child not found.</div>
  if (!child) return <div style={{ textAlign: 'center', padding: 48 }}>Loading...</div>

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 32 }}>
      <button
        type="button"
        onClick={() => navigate('/')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6c757d', fontSize: 16, marginBottom: 24 }}
      >
        ← Back
      </button>

      <h1 style={{ textAlign: 'center', marginBottom: 8 }}>{child.name}</h1>
      <p style={{ textAlign: 'center', color: '#6c757d', marginBottom: 40 }}>Choose a module</p>

      <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
        <div style={{ border: '1px solid #dee2e6', borderRadius: 12, padding: 32, minWidth: 240, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
          <h2 style={{ margin: '0 0 8px' }}>Dictation</h2>
          <span style={{
            background: LEVEL_COLOURS[child.level] ?? LEVEL_COLOURS['Beginner'],
            color: 'white',
            borderRadius: 20,
            padding: '4px 12px',
            fontSize: 13,
            fontWeight: 600,
            display: 'inline-block',
            marginBottom: 20,
          }}>
            {child.level}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              type="button"
              onClick={() => navigate(`/session-start/${child.id}`)}
              style={{ padding: '10px 20px', cursor: 'pointer', background: '#0d6efd', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 15 }}
            >
              Start Session
            </button>
            <button
              type="button"
              onClick={() => navigate(`/dashboard/${child.id}`)}
              style={{ padding: '10px 20px', cursor: 'pointer', background: 'transparent', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 15 }}
            >
              View Progress
            </button>
          </div>
        </div>

        <div style={{ border: '1px solid #dee2e6', borderRadius: 12, padding: 32, minWidth: 240, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔢</div>
          <h2 style={{ margin: '0 0 8px' }}>Mental Maths</h2>
          <span style={{
            background: LEVEL_COLOURS[child.mathsLevel] ?? LEVEL_COLOURS['Beginner'],
            color: 'white',
            borderRadius: 20,
            padding: '4px 12px',
            fontSize: 13,
            fontWeight: 600,
            display: 'inline-block',
            marginBottom: 20,
          }}>
            {child.mathsLevel ?? 'Beginner'}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              type="button"
              onClick={() => navigate(`/maths-start/${child.id}`)}
              style={{ padding: '10px 20px', cursor: 'pointer', background: '#0d6efd', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 15 }}
            >
              Start Session
            </button>
            <button
              type="button"
              onClick={() => navigate(`/maths-dashboard/${child.id}`)}
              style={{ padding: '10px 20px', cursor: 'pointer', background: 'transparent', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 15 }}
            >
              View Progress
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

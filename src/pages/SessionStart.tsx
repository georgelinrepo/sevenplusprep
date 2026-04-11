// src/pages/SessionStart.tsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getChildren } from '../api/children'
import { generateSentences } from '../api/functions'
import type { Child, Level } from '../types'

const LEVELS: Level[] = ['Beginner', 'Developing', 'Confident', 'Stretch']

export function SessionStart() {
  const { childId } = useParams<{ childId: string }>()
  const [child, setChild] = useState<Child | null>(null)
  const [selectedLevel, setSelectedLevel] = useState<Level>('Beginner')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    getChildren().then(children => {
      const found = children.find(c => c.id === childId)
      if (found) {
        setChild(found)
        setSelectedLevel(found.level ?? 'Beginner')
      }
    })
  }, [childId])

  async function handleBegin() {
    if (!child) return
    setGenerating(true)
    setError(null)
    try {
      const sentences = await generateSentences(selectedLevel)
      navigate(`/dictation/${child.id}`, { state: { sentences, level: selectedLevel } })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate sentences — please try again')
      setGenerating(false)
    }
  }

  if (!child) return <div style={{ textAlign: 'center', padding: 48 }}>Loading...</div>

  const isRecommended = selectedLevel === (child.level ?? 'Beginner')

  return (
    <div style={{ maxWidth: 500, margin: '80px auto', padding: 32, textAlign: 'center' }}>
      <h1>{child.name}</h1>
      <p style={{ color: '#6c757d', marginBottom: 24 }}>
        3 sentences, each read aloud 3 times.<br />Write on paper, then check your work.
      </p>

      <div style={{ marginBottom: 32 }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>
          Level
          {isRecommended && (
            <span style={{ marginLeft: 8, fontSize: 12, background: '#d1e7dd', color: '#0f5132', borderRadius: 10, padding: '2px 8px', fontWeight: 400 }}>
              Recommended
            </span>
          )}
        </label>
        <select
          value={selectedLevel}
          onChange={e => setSelectedLevel(e.target.value as Level)}
          style={{ width: '100%', padding: '10px 12px', fontSize: 16, borderRadius: 8, border: '1px solid #dee2e6', cursor: 'pointer' }}
        >
          {LEVELS.map(l => (
            <option key={l} value={l}>
              {l}{l === (child.level ?? 'Beginner') ? ' (recommended)' : ''}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={handleBegin}
        disabled={generating}
        style={{ padding: '16px 40px', fontSize: 20, cursor: generating ? 'not-allowed' : 'pointer', background: '#0d6efd', color: 'white', border: 'none', borderRadius: 12, fontWeight: 600 }}
      >
        {generating ? 'Generating sentences...' : 'Begin Session'}
      </button>
      {error && <p style={{ color: '#dc3545', marginTop: 16 }}>{error}</p>}
      <br />
      <button
        type="button"
        onClick={() => navigate(`/child/${childId}`)}
        style={{ marginTop: 16, padding: '10px 20px', cursor: 'pointer', background: 'transparent', border: 'none', color: '#6c757d', fontSize: 16 }}
      >
        ← Back
      </button>
    </div>
  )
}

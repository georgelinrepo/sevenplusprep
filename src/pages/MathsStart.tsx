import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getChildren } from '../api/children'
import { generateMathsQuestions } from '../api/functions'
import type { Child, MathsQuestion } from '../types'

export function MathsStart() {
  const { childId } = useParams<{ childId: string }>()
  const [child, setChild] = useState<Child | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    getChildren().then(children => {
      const found = children.find(c => c.id === childId)
      if (found) setChild(found)
    })
  }, [childId])

  async function handleBegin() {
    if (!child) return
    setGenerating(true)
    setError(null)
    try {
      const questions: MathsQuestion[] = await generateMathsQuestions(child.mathsLevel ?? 'Beginner')
      navigate(`/maths-play/${child.id}`, { state: { questions } })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate questions — please try again')
      setGenerating(false)
    }
  }

  if (!child) return <div style={{ textAlign: 'center', padding: 48 }}>Loading...</div>

  return (
    <div style={{ maxWidth: 500, margin: '80px auto', padding: 32, textAlign: 'center' }}>
      <h1>{child.name}</h1>
      <div style={{ fontSize: 20, color: '#6c757d', marginBottom: 8 }}>
        Maths level: <strong>{child.mathsLevel ?? 'Beginner'}</strong>
      </div>
      <p style={{ color: '#6c757d', marginBottom: 40 }}>
        15 questions, each read aloud twice.<br />
        Write answers on paper, then enter them at the end.
      </p>
      <button
        type="button"
        onClick={handleBegin}
        disabled={generating}
        style={{ padding: '16px 40px', fontSize: 20, cursor: 'pointer', background: '#0d6efd', color: 'white', border: 'none', borderRadius: 12, fontWeight: 600 }}
      >
        {generating ? 'Generating questions...' : 'Begin Session'}
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

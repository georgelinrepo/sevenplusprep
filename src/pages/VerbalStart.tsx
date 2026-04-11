import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getChildren } from '../api/children'
import { generateVerbalQuestions } from '../api/functions'
import type { Child, Level, VerbalQuestion } from '../types'

const LEVELS: Level[] = ['Beginner', 'Developing', 'Confident', 'Stretch']
const PAPER_LENGTHS = [
  { label: 'Short (10 questions)', value: 10 },
  { label: 'Standard (20 questions)', value: 20 },
  { label: 'Full Mock (30 questions)', value: 30 },
]

export function VerbalStart() {
  const { childId } = useParams<{ childId: string }>()
  const [child, setChild] = useState<Child | null>(null)
  const [selectedLevel, setSelectedLevel] = useState<Level>('Beginner')
  const [paperLength, setPaperLength] = useState<number>(20)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    getChildren().then(children => {
      const found = children.find(c => c.id === childId)
      if (found) {
        setChild(found)
        setSelectedLevel(found.verbalLevel ?? 'Beginner')
      }
    })
  }, [childId])

  async function handleGenerate() {
    if (!child) return
    setGenerating(true)
    setError(null)
    try {
      const questions: VerbalQuestion[] = await generateVerbalQuestions(selectedLevel, paperLength)
      navigate(`/verbal-paper/${child.id}`, { state: { questions, level: selectedLevel, paperLength } })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate paper — please try again')
      setGenerating(false)
    }
  }

  if (!child) return <div style={{ textAlign: 'center', padding: 48 }}>Loading...</div>

  const isRecommended = selectedLevel === (child.verbalLevel ?? 'Beginner')

  return (
    <div style={{ maxWidth: 500, margin: '60px auto', padding: 32 }}>
      <button
        type="button"
        onClick={() => navigate(`/child/${childId}`)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6c757d', fontSize: 16, marginBottom: 24 }}
      >
        ← Back
      </button>

      <h1 style={{ textAlign: 'center', marginBottom: 8 }}>{child.name}</h1>
      <p style={{ textAlign: 'center', color: '#6c757d', marginBottom: 40 }}>
        Verbal Reasoning Practice Paper
      </p>

      <div style={{ marginBottom: 24 }}>
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
              {l}{l === (child.verbalLevel ?? 'Beginner') ? ' (recommended)' : ''}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 40 }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>Paper Length</label>
        <div style={{ display: 'flex', gap: 12 }}>
          {PAPER_LENGTHS.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              onClick={() => setPaperLength(value)}
              style={{
                flex: 1, padding: '10px 8px', fontSize: 14, cursor: 'pointer', borderRadius: 8,
                border: paperLength === value ? '2px solid #0d6efd' : '1px solid #dee2e6',
                background: paperLength === value ? '#e7f1ff' : 'white',
                fontWeight: paperLength === value ? 600 : 400,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={generating}
        style={{ width: '100%', padding: '16px', fontSize: 18, cursor: generating ? 'not-allowed' : 'pointer', background: '#0d6efd', color: 'white', border: 'none', borderRadius: 12, fontWeight: 600 }}
      >
        {generating ? 'Generating paper...' : 'Generate Paper'}
      </button>
      {error && <p style={{ color: '#dc3545', marginTop: 16 }}>{error}</p>}
    </div>
  )
}

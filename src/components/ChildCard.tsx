// src/components/ChildCard.tsx
import type { Child } from '../types'

const LEVEL_COLOURS: Record<string, string> = {
  Beginner: '#6c757d',
  Developing: '#0d6efd',
  Confident: '#198754',
  Stretch: '#dc3545',
}

interface Props {
  child: Child
  onStart: () => void
  onViewProgress: () => void
}

export function ChildCard({ child, onStart, onViewProgress }: Props) {
  return (
    <div style={{ border: '1px solid #dee2e6', borderRadius: 12, padding: 24, minWidth: 200, textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 8 }}>👤</div>
      <h2 style={{ margin: '0 0 8px' }}>{child.name}</h2>
      <span style={{
        background: LEVEL_COLOURS[child.level],
        color: 'white',
        borderRadius: 20,
        padding: '4px 12px',
        fontSize: 14,
        fontWeight: 600,
      }}>
        {child.level}
      </span>
      <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'center' }}>
        <button onClick={onStart} style={{ padding: '8px 20px', cursor: 'pointer', background: '#0d6efd', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600 }}>
          Start Session
        </button>
        <button onClick={onViewProgress} style={{ padding: '8px 16px', cursor: 'pointer', background: 'transparent', border: '1px solid #dee2e6', borderRadius: 8 }}>
          Progress
        </button>
      </div>
    </div>
  )
}

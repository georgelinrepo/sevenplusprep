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
  onSelect: () => void
  onDelete: () => void
}

export function ChildCard({ child, onSelect, onDelete }: Props) {
  function handleDelete() {
    if (window.confirm(`Delete ${child.name}? All sessions will be permanently deleted. This cannot be undone.`)) {
      onDelete()
    }
  }

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
        <button
          onClick={onSelect}
          style={{ padding: '8px 20px', cursor: 'pointer', background: '#0d6efd', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600 }}
        >
          Select
        </button>
        <button
          onClick={handleDelete}
          style={{ padding: '8px 12px', cursor: 'pointer', background: 'transparent', border: '1px solid #dc3545', borderRadius: 8, color: '#dc3545' }}
        >
          Delete
        </button>
      </div>
    </div>
  )
}

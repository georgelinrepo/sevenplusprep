// src/components/AddChildModal.tsx
import { useState } from 'react'

interface Props {
  onAdd: (name: string) => void
  onClose: () => void
}

export function AddChildModal({ onAdd, onClose }: Props) {
  const [name, setName] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (name.trim()) {
      onAdd(name.trim())
      onClose()
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: 'white', borderRadius: 12, padding: 32, minWidth: 320 }}>
        <h2 style={{ marginTop: 0 }}>Add Child</h2>
        <form onSubmit={handleSubmit}>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Child's name"
            style={{ width: '100%', padding: 12, fontSize: 18, borderRadius: 8, border: '1px solid #dee2e6', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 20px', cursor: 'pointer', border: '1px solid #dee2e6', borderRadius: 8, background: 'transparent' }}>Cancel</button>
            <button type="submit" disabled={!name.trim()} style={{ padding: '10px 20px', cursor: 'pointer', background: '#0d6efd', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600 }}>Add</button>
          </div>
        </form>
      </div>
    </div>
  )
}

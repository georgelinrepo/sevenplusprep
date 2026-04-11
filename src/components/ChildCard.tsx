// src/components/ChildCard.tsx
import { useRef, useState } from 'react'
import { updateChildPhoto } from '../api/children'
import type { Child } from '../types'

interface Props {
  child: Child
  onSelect: () => void
  onDelete: () => void
  onPhotoUpdate: (photoURL: string) => void
}

export function ChildCard({ child, onSelect, onDelete, onPhotoUpdate }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  function handleDelete() {
    if (window.confirm(`Delete ${child.name}? All sessions will be permanently deleted. This cannot be undone.`)) {
      onDelete()
    }
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const photoURL = await updateChildPhoto(child.id, file)
      onPhotoUpdate(photoURL)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div style={{ border: '1px solid #dee2e6', borderRadius: 12, padding: 24, minWidth: 200, textAlign: 'center' }}>
      <div
        onClick={() => fileInputRef.current?.click()}
        title="Click to change photo"
        style={{ position: 'relative', display: 'inline-block', marginBottom: 8, cursor: 'pointer' }}
      >
        {child.photoURL ? (
          <img
            src={child.photoURL}
            alt={child.name}
            style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
            👤
          </div>
        )}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: uploading ? 1 : 0, transition: 'opacity 0.15s',
          fontSize: 18, color: 'white',
        }}
          onMouseEnter={e => { if (!uploading) (e.currentTarget as HTMLElement).style.opacity = '1' }}
          onMouseLeave={e => { if (!uploading) (e.currentTarget as HTMLElement).style.opacity = '0' }}
        >
          {uploading ? '…' : '📷'}
        </div>
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
      <h2 style={{ margin: '0 0 16px' }}>{child.name}</h2>
      <div style={{ marginTop: 0, display: 'flex', gap: 8, justifyContent: 'center' }}>
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

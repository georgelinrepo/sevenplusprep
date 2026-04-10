// src/pages/Home.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChildCard } from '../components/ChildCard'
import { AddChildModal } from '../components/AddChildModal'
import { getChildren, addChild } from '../api/children'
import type { Child } from '../types'

export function Home() {
  const [children, setChildren] = useState<Child[]>([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getChildren().then(c => { setChildren(c); setLoading(false) })
  }, [])

  async function handleAddChild(name: string) {
    const child = await addChild(name)
    setChildren(prev => [...prev, child])
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 48 }}>Loading...</div>

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 32 }}>
      <h1 style={{ textAlign: 'center', marginBottom: 8 }}>SevenPlusPrep</h1>
      <p style={{ textAlign: 'center', color: '#6c757d', marginBottom: 40 }}>SPJ 7+ Dictation Practice</p>

      {children.length === 0 && (
        <p style={{ textAlign: 'center', color: '#6c757d' }}>No children yet — add one to get started.</p>
      )}

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
        {children.map(child => (
          <ChildCard
            key={child.id}
            child={child}
            onStart={() => navigate(`/session-start/${child.id}`)}
            onViewProgress={() => navigate(`/dashboard/${child.id}`)}
          />
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: 32 }}>
        <button
          onClick={() => setShowModal(true)}
          style={{ padding: '12px 24px', cursor: 'pointer', border: '2px dashed #dee2e6', borderRadius: 12, background: 'transparent', fontSize: 16, color: '#6c757d' }}
        >
          + Add Child
        </button>
      </div>

      {showModal && <AddChildModal onAdd={handleAddChild} onClose={() => setShowModal(false)} />}
    </div>
  )
}

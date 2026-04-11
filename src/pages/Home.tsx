// src/pages/Home.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChildCard } from '../components/ChildCard'
import { AddChildModal } from '../components/AddChildModal'
import { getChildren, addChild, deleteChild } from '../api/children'
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

  async function handleDeleteChild(childId: string) {
    try {
      await deleteChild(childId)
      setChildren(prev => prev.filter(c => c.id !== childId))
    } catch (err) {
      console.error('Failed to delete child:', err)
      alert('Failed to delete. Please try again.')
    }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 48 }}>Loading...</div>

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 32 }}>
      <h1 style={{ textAlign: 'center', marginBottom: 8 }}>7+ School Entrance Exam Prep</h1>
      <p style={{ textAlign: 'center', color: '#6c757d', marginBottom: 40 }}>
        {children.length === 0 ? 'Create a child profile to get started' : 'Select a child profile or add a new one below'}
      </p>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
        {children.map(child => (
          <ChildCard
            key={child.id}
            child={child}
            onSelect={() => navigate(`/child/${child.id}`)}
            onDelete={() => handleDeleteChild(child.id)}
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

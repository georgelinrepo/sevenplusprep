// src/pages/MathsPlay.tsx
import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useTTS } from '../hooks/useTTS'
import { useCountdown } from '../hooks/useCountdown'
import { CountdownTimer } from '../components/CountdownTimer'
import type { Level, MathsQuestion } from '../types'

type Phase = 'read1' | 'pause1' | 'read2' | 'countdown' | 'paused'

interface LocationState {
  questions: MathsQuestion[]
  level: Level
}

export function MathsPlay() {
  const { childId } = useParams<{ childId: string }>()
  const navigate = useNavigate()
  const { state } = useLocation() as { state: LocationState }
  const { speak, stop } = useTTS()
  const { seconds, start: startCountdown, reset: resetCountdown } = useCountdown()

  // Stabilise questions — they come from router state and never change
  const questionsRef = useRef<MathsQuestion[]>(state?.questions ?? [])
  const questions = questionsRef.current

  const [currentIndex, setCurrentIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('read1')
  const [pausedPhase, setPausedPhase] = useState<Phase | null>(null)
  const [pausedSeconds, setPausedSeconds] = useState(0)

  useEffect(() => {
    if (!questions[currentIndex]) return
    let cancelled = false

    const questionText = `Question ${currentIndex + 1}: ${questions[currentIndex].question}`
    if (phase === 'read1') {
      speak(questionText, () => {
        if (!cancelled) setPhase('pause1')
      })
    } else if (phase === 'pause1') {
      startCountdown(5, () => {
        if (!cancelled) setPhase('read2')
      })
    } else if (phase === 'read2') {
      speak(questionText, () => {
        if (!cancelled) setPhase('countdown')
      })
    } else if (phase === 'countdown') {
      startCountdown(pausedSeconds > 0 ? pausedSeconds : 15, () => {
        if (!cancelled) {
          setPausedSeconds(0)
          if (currentIndex < 14) {
            setCurrentIndex(i => i + 1)
            resetCountdown()
            setPhase('read1')
          } else {
            navigate(`/maths-entry/${childId}`, { state: { questions, level: state?.level } })
          }
        }
      })
    }

    return () => {
      cancelled = true
    }
  }, [phase, currentIndex, questions, speak, startCountdown, resetCountdown, navigate, childId, pausedSeconds])

  function handlePause() {
    stop()
    if (phase === 'countdown') {
      setPausedSeconds(seconds)
    }
    resetCountdown()
    setPausedPhase(phase)
    setPhase('paused')
  }

  function handleResume() {
    const resumeTo = pausedPhase ?? 'read1'
    setPausedPhase(null)
    setPhase(resumeTo)
  }

  if (!questions.length) {
    return <div style={{ textAlign: 'center', padding: 48 }}>No questions — go back and start again.</div>
  }

  const progress = ((currentIndex + 1) / 15) * 100

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <span style={{ color: '#6c757d' }}>Question {currentIndex + 1} of 15</span>
        <button
          type="button"
          onClick={phase === 'paused' ? handleResume : handlePause}
          style={{ padding: '8px 16px', cursor: 'pointer', background: 'transparent', border: '1px solid #dee2e6', borderRadius: 8 }}
        >
          {phase === 'paused' ? '▶ Resume' : '⏸ Pause'}
        </button>
      </div>

      <div style={{ height: 8, background: '#e9ecef', borderRadius: 4, marginBottom: 32, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: '#0d6efd', width: `${progress}%`, transition: 'width 0.3s' }} />
      </div>

      {phase === 'paused' && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏸</div>
          <p style={{ color: '#6c757d', fontSize: 18 }}>Paused</p>
        </div>
      )}

      {(phase === 'read1' || phase === 'read2') && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🔊</div>
          <div style={{ fontSize: 20, color: '#6c757d' }}>
            {phase === 'read1' ? 'Listen carefully...' : 'Listen again...'}
          </div>
        </div>
      )}

      {phase === 'pause1' && (
        <CountdownTimer seconds={seconds} label="Get ready to write..." />
      )}

      {phase === 'countdown' && (
        <CountdownTimer seconds={seconds} label="Write your answer on paper" />
      )}
    </div>
  )
}

// src/pages/Dictation.tsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { getChildren } from '../api/children'
import { markAnswer } from '../api/functions'
import { useTTS } from '../hooks/useTTS'
import { useCountdown } from '../hooks/useCountdown'
import { CountdownTimer } from '../components/CountdownTimer'
import type { Child, SentenceResult, Level } from '../types'

type Phase = 'loading' | 'read1' | 'pause1' | 'read2' | 'pause2' | 'read3' | 'pause3' | 'input' | 'marked'

export function Dictation() {
  const { childId } = useParams<{ childId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { speak } = useTTS()
  const { seconds, start: startCountdown, reset: resetCountdown } = useCountdown()

  const [child, setChild] = useState<Child | null>(null)
  const [sentences, setSentences] = useState<string[]>([])
  const [sessionLevel, setSessionLevel] = useState<Level>('Beginner')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('loading')
  const [childAnswer, setChildAnswer] = useState('')
  const [results, setResults] = useState<SentenceResult[]>([])
  const [marking, setMarking] = useState(false)
  const [markError, setMarkError] = useState<string | null>(null)
  const [currentResult, setCurrentResult] = useState<SentenceResult | null>(null)

  useEffect(() => {
    async function init() {
      const children = await getChildren()
      const found = children.find(c => c.id === childId)
      if (!found) return
      setChild(found)
      const state = location.state as { sentences?: string[]; level?: Level } | null
      const levelToUse: Level = state?.level ?? (found.level as Level) ?? 'Beginner'
      setSessionLevel(levelToUse)
      const stateSentences = state?.sentences
      if (!stateSentences || stateSentences.length === 0) {
        navigate(`/session-start/${childId}`, { replace: true })
        return
      }
      setSentences(stateSentences)
      setPhase('read1')
    }
    init()
  }, [childId, location])

  // Trigger TTS on read phases
  useEffect(() => {
    if (!sentences[currentIndex]) return
    const sentence = sentences[currentIndex]

    if (phase === 'read1') {
      speak(sentence, () => {
        setPhase('pause1')
        startCountdown(15, () => setPhase('read2'))
      })
    } else if (phase === 'read2') {
      speak(sentence, () => {
        setPhase('pause2')
        startCountdown(15, () => setPhase('read3'))
      })
    } else if (phase === 'read3') {
      speak(sentence, () => {
        setPhase('pause3')
        startCountdown(10, () => setPhase('input'))
      })
    }
  }, [phase, currentIndex, sentences])

  async function handleMarkAnswer() {
    if (!sentences[currentIndex] || !childAnswer.trim()) return
    setMarking(true)
    setMarkError(null)
    try {
      const result = await markAnswer(sentences[currentIndex], childAnswer)
      const sentenceResult: SentenceResult = {
        correct: sentences[currentIndex],
        childAnswer,
        score: result.score,
        errors: result.errors,
      }
      setCurrentResult(sentenceResult)
      setResults(prev => [...prev, sentenceResult])
      setPhase('marked')
    } catch (e) {
      setMarkError(e instanceof Error ? e.message : 'Marking failed — please try again')
    } finally {
      setMarking(false)
    }
  }

  function handleNext() {
    if (currentIndex < 2) {
      setCurrentIndex(i => i + 1)
      setChildAnswer('')
      setCurrentResult(null)
      resetCountdown()
      setPhase('read1')
    } else {
      navigate(`/results/${childId}`, { state: { results, level: sessionLevel } })
    }
  }

  if (phase === 'loading' || !child) {
    return <div style={{ textAlign: 'center', padding: 48, fontSize: 20 }}>Loading...</div>
  }

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <span style={{ color: '#6c757d' }}>{child.name} — {sessionLevel}</span>
        <span style={{ fontWeight: 700 }}>Sentence {currentIndex + 1} of 3</span>
      </div>

      {(phase === 'read1' || phase === 'read2' || phase === 'read3') && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🔊</div>
          <div style={{ fontSize: 20, color: '#6c757d' }}>
            {phase === 'read1' && 'Listen carefully...'}
            {phase === 'read2' && 'Write it down...'}
            {phase === 'read3' && 'Check your work...'}
          </div>
        </div>
      )}

      {(phase === 'pause1' || phase === 'pause2' || phase === 'pause3') && (
        <CountdownTimer
          seconds={seconds}
          label={phase === 'pause3' ? 'Check your work before the next read' : 'Continue writing...'}
        />
      )}

      {phase === 'input' && (
        <div>
          <p style={{ fontSize: 18, marginBottom: 16 }}>Type exactly what the child wrote on paper:</p>
          <textarea
            autoFocus
            value={childAnswer}
            onChange={e => setChildAnswer(e.target.value)}
            rows={4}
            style={{ width: '100%', padding: 12, fontSize: 16, borderRadius: 8, border: '1px solid #dee2e6', boxSizing: 'border-box', resize: 'vertical' }}
            placeholder="Type child's answer here..."
          />
          <button
            onClick={handleMarkAnswer}
            disabled={!childAnswer.trim() || marking}
            style={{ marginTop: 12, width: '100%', padding: '14px', fontSize: 18, cursor: 'pointer', background: '#198754', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600 }}
          >
            {marking ? 'Marking...' : 'Mark Answer'}
          </button>
          {markError && (
            <p style={{ color: '#dc3545', marginTop: 8, textAlign: 'center' }}>{markError}</p>
          )}
        </div>
      )}

      {phase === 'marked' && currentResult && (
        <div>
          <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 16 }}>
            {currentResult.score >= 80 ? '✅' : currentResult.score >= 50 ? '🟡' : '❌'}
            {' '}{currentResult.score}/100
          </div>
          <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <div style={{ marginBottom: 8 }}><strong>Correct:</strong> {currentResult.correct}</div>
            <div><strong>Child wrote:</strong> {currentResult.childAnswer}</div>
          </div>
          {currentResult.errors.length === 0 ? (
            <p style={{ color: '#198754', fontWeight: 600, textAlign: 'center' }}>Perfect! No errors.</p>
          ) : (
            <ul style={{ paddingLeft: 20 }}>
              {currentResult.errors.map((e, i) => (
                <li key={i} style={{ marginBottom: 4 }}>
                  <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{e.type}</span>: wrote "{e.word}" → should be "{e.correction}"
                </li>
              ))}
            </ul>
          )}
          <button
            onClick={handleNext}
            style={{ marginTop: 16, width: '100%', padding: '14px', fontSize: 18, cursor: 'pointer', background: '#0d6efd', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600 }}
          >
            {currentIndex < 2 ? 'Next Sentence →' : 'See Results →'}
          </button>
        </div>
      )}
    </div>
  )
}

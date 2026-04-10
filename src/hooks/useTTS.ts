// src/hooks/useTTS.ts
import { useRef, useCallback } from 'react'
import { generateAudio } from '../api/functions'

export function useTTS() {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const speak = useCallback(async (text: string, onEnd?: () => void) => {
    if (audioRef.current) {
      audioRef.current.pause()
      URL.revokeObjectURL(audioRef.current.src)
      audioRef.current = null
    }
    try {
      const url = await generateAudio(text)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => {
        URL.revokeObjectURL(url)
        onEnd?.()
      }
      await audio.play()
    } catch (e) {
      console.error('TTS error:', e)
      onEnd?.()
    }
  }, [])

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      URL.revokeObjectURL(audioRef.current.src)
      audioRef.current = null
    }
  }, [])

  return { speak, stop }
}

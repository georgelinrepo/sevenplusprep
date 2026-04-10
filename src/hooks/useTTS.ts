// src/hooks/useTTS.ts
import { useRef } from 'react'
import { generateAudio } from '../api/functions'

export function useTTS() {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  async function speak(text: string, onEnd?: () => void) {
    // Stop any currently playing audio
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
      onEnd?.() // advance the session flow even if TTS fails
    }
  }

  function stop() {
    if (audioRef.current) {
      audioRef.current.pause()
      URL.revokeObjectURL(audioRef.current.src)
      audioRef.current = null
    }
  }

  return { speak, stop }
}

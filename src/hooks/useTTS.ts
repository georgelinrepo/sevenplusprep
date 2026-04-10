// src/hooks/useTTS.ts
export function useTTS() {
  function speak(text: string, onEnd?: () => void) {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.85   // slightly slower than default for clarity
    utterance.lang = 'en-GB'
    if (onEnd) utterance.onend = onEnd
    window.speechSynthesis.speak(utterance)
  }

  function stop() {
    if (window.speechSynthesis) window.speechSynthesis.cancel()
  }

  return { speak, stop }
}

'use client'
/**
 * useTtsPlayer — text-to-speech playback hook for the AI Tutor.
 *
 * POSTs the assistant message text to /api/tutor/speak, which calls the
 * z-ai-web-dev-sdk TTS service and returns a WAV audio buffer. Plays it
 * through an in-memory <audio> element.
 *
 * Public API:
 *   const { playing, loading, play, stop, error } = useTtsPlayer()
 *
 * Voice/speed are read from localStorage keys 'lernio.tts.voice' (default
 * 'tongtong') and 'lernio.tts.speed' (default 1.0) so the user's prefs
 * persist across sessions.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

const VOICE_KEY = 'lernio.tts.voice'
const SPEED_KEY = 'lernio.tts.speed'

export function getTtsPrefs() {
  if (typeof window === 'undefined') return { voice: 'tongtong', speed: 1.0 }
  const voice = localStorage.getItem(VOICE_KEY) || 'tongtong'
  const speedRaw = parseFloat(localStorage.getItem(SPEED_KEY) || '1.0')
  const speed = Number.isFinite(speedRaw) ? Math.min(2, Math.max(0.5, speedRaw)) : 1.0
  return { voice, speed }
}

export function setTtsPrefs(prefs: { voice?: string; speed?: number }) {
  if (typeof window === 'undefined') return
  if (prefs.voice) localStorage.setItem(VOICE_KEY, prefs.voice)
  if (prefs.speed !== undefined) localStorage.setItem(SPEED_KEY, String(prefs.speed))
}

export interface TtsVoiceOption {
  value: string
  label: string
  description: string
}

export const TTS_VOICES: TtsVoiceOption[] = [
  { value: 'tongtong', label: 'Tongtong', description: 'Warm & friendly' },
  { value: 'chuichui', label: 'Chuichui', description: 'Lively & playful' },
  { value: 'xiaochen', label: 'Xiaochen', description: 'Calm & professional' },
  { value: 'jam', label: 'Jam', description: 'British English' },
  { value: 'kazi', label: 'Kazi', description: 'Clear & standard' },
  { value: 'douji', label: 'Douji', description: 'Natural flow' },
  { value: 'luodo', label: 'Luodo', description: 'Expressive' },
]

export function useTtsPlayer() {
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const audioElRef = useRef<HTMLAudioElement | null>(null)
  const currentUrlRef = useRef<string | null>(null)

  // Create a single audio element we reuse.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const el = new Audio()
    el.preload = 'auto'
    audioElRef.current = el
    const onEnded = () => {
      setPlaying(false)
      if (currentUrlRef.current) {
        URL.revokeObjectURL(currentUrlRef.current)
        currentUrlRef.current = null
      }
    }
    el.addEventListener('ended', onEnded)
    el.addEventListener('error', () => {
      setPlaying(false)
      setError('Playback failed.')
    })
    return () => {
      el.removeEventListener('ended', onEnded)
      el.pause()
      if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current)
    }
  }, [])

  const stop = useCallback(() => {
    const el = audioElRef.current
    if (el) {
      el.pause()
      el.currentTime = 0
    }
    setPlaying(false)
    if (currentUrlRef.current) {
      URL.revokeObjectURL(currentUrlRef.current)
      currentUrlRef.current = null
    }
  }, [])

  const play = useCallback(
    async (text: string) => {
      if (!text.trim()) return
      setError(null)
      // If already playing, stop first so the new play takes over.
      if (audioElRef.current && !audioElRef.current.paused) {
        stop()
      }

      setLoading(true)
      try {
        const { voice, speed } = getTtsPrefs()
        const res = await fetch('/api/tutor/speak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice, speed }),
        })
        if (!res.ok) {
          const j = await res.json().catch(() => null)
          throw new Error(j?.error?.message || 'TTS failed')
        }
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        currentUrlRef.current = url
        const el = audioElRef.current
        if (!el) return
        el.src = url
        await el.play()
        setPlaying(true)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        setError(msg || 'Voice synthesis failed.')
      } finally {
        setLoading(false)
      }
    },
    [stop],
  )

  return { playing, loading, error, play, stop, clearError: () => setError(null) }
}

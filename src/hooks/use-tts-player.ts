'use client'
/**
 * useTtsPlayer — text-to-speech playback hook for the AI Tutor.
 *
 * POSTs the assistant message text to /api/tutor/speak, which calls the
 * configured AI provider TTS service and returns a WAV audio buffer. Plays it
 * through an in-memory <audio> element.
 *
 * Public API:
 *   const { playing, loading, play, stop, error } = useTtsPlayer()
 *
 * Voice/speed are read from localStorage keys 'lernio.tts.voice' (default
 * 'hannah') and 'lernio.tts.speed' (default 1.0) so the user's prefs
 * persist across sessions.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

const VOICE_KEY = 'lernio.tts.voice'
const SPEED_KEY = 'lernio.tts.speed'

export function getTtsPrefs() {
  if (typeof window === 'undefined') return { voice: 'hannah', speed: 1.0 }
  const voice = localStorage.getItem(VOICE_KEY) || 'hannah'
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
  { value: 'hannah', label: 'Hannah', description: 'Warm and clear' },
  { value: 'autumn', label: 'Autumn', description: 'Calm and friendly' },
  { value: 'diana', label: 'Diana', description: 'Bright and focused' },
  { value: 'austin', label: 'Austin', description: 'Confident and crisp' },
  { value: 'daniel', label: 'Daniel', description: 'Steady and direct' },
  { value: 'troy', label: 'Troy', description: 'Energetic and natural' },
]

function splitTtsText(text: string, maxChars = 900): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned) return []

  const sentences = cleaned.match(/[^.!?]+[.!?]+|\S.+$/g) ?? [cleaned]
  const chunks: string[] = []
  let current = ''

  for (const sentence of sentences) {
    const next = current ? `${current} ${sentence.trim()}` : sentence.trim()
    if (next.length <= maxChars) {
      current = next
      continue
    }
    if (current) chunks.push(current)

    let remainder = sentence.trim()
    while (remainder.length > maxChars) {
      chunks.push(remainder.slice(0, maxChars).trim())
      remainder = remainder.slice(maxChars).trim()
    }
    current = remainder
  }

  if (current) chunks.push(current)
  return chunks
}

export function useTtsPlayer() {
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const audioElRef = useRef<HTMLAudioElement | null>(null)
  const currentUrlRef = useRef<string | null>(null)
  const playTokenRef = useRef(0)
  const playResolveRef = useRef<(() => void) | null>(null)

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
    playTokenRef.current += 1
    const el = audioElRef.current
    if (el) {
      el.pause()
      el.currentTime = 0
    }
    playResolveRef.current?.()
    playResolveRef.current = null
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
        const token = ++playTokenRef.current
        const chunks = splitTtsText(text)
        const el = audioElRef.current
        if (!el) return
        el.playbackRate = speed

        for (const chunk of chunks) {
          if (playTokenRef.current !== token) return
          const res = await fetch('/api/tutor/speak', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: chunk, voice, speed }),
          })
          if (!res.ok) {
            const j = await res.json().catch(() => null)
            throw new Error(j?.error?.message || 'TTS failed')
          }
          const blob = await res.blob()
          const url = URL.createObjectURL(blob)
          currentUrlRef.current = url
          el.src = url
          await el.play()
          setPlaying(true)

          await new Promise<void>((resolve, reject) => {
            playResolveRef.current = resolve
            const cleanup = () => {
              el.removeEventListener('ended', onEnded)
              el.removeEventListener('error', onError)
              if (playResolveRef.current === resolve) {
                playResolveRef.current = null
              }
            }
            const onEnded = () => {
              cleanup()
              resolve()
            }
            const onError = () => {
              cleanup()
              reject(new Error('Playback failed.'))
            }
            el.addEventListener('ended', onEnded)
            el.addEventListener('error', onError)
          })

          if (currentUrlRef.current) {
            URL.revokeObjectURL(currentUrlRef.current)
            currentUrlRef.current = null
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        setError(msg || 'Voice synthesis failed.')
      } finally {
        setPlaying(false)
        setLoading(false)
      }
    },
    [stop],
  )

  return { playing, loading, error, play, stop, clearError: () => setError(null) }
}

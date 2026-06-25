'use client'
/**
 * useVoiceRecorder — browser mic recording hook for the AI Tutor voice input.
 *
 * Uses MediaRecorder API. Records in the browser's preferred audio format
 * (usually audio/webm; opus), then converts the Blob to base64 for POSTing
 * to /api/tutor/voice which calls the configured AI provider ASR service.
 *
 * Public API:
 *   const { recording, elapsedMs, error, start, stop, cancel } = useVoiceRecorder({
 *     onComplete: async (base64, mimeType) => { ... }
 *   })
 */
import { useCallback, useEffect, useRef, useState } from 'react'

interface UseVoiceRecorderOptions {
  onComplete: (base64: string, mimeType: string) => void | Promise<void>
  /** Hard cap on recording length, ms (default 60_000). */
  maxMs?: number
}

export function useVoiceRecorder(opts: UseVoiceRecorderOptions) {
  const { onComplete, maxMs = 60_000 } = opts
  const [recording, setRecording] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const startedAtRef = useRef<number>(0)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const cancelRef = useRef(false)
  // Keep onComplete in a ref so the consumer can change it without re-creating
  // the start/stop callbacks.
  const onCompleteRef = useRef(onComplete)
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  const cleanup = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current)
    tickRef.current = null
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    // Detach the MediaRecorder — we don't write to its `.stream` property
    // (it's read-only); just drop our reference so it can be GC'd.
    mediaRecorderRef.current = null
    setRecording(false)
    setElapsedMs(0)
  }, [])

  useEffect(() => () => cleanup(), [cleanup])

  const start = useCallback(async () => {
    setError(null)
    cancelRef.current = false
    chunksRef.current = []

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Microphone not supported in this browser.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Pick the best mime type the browser supports.
      const candidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ]
      const mimeType =
        candidates.find((c) =>
          typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(c),
        ) || ''

      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRecorderRef.current = mr

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || mimeType || 'audio/webm' })
        cleanup()
        if (cancelRef.current) return
        if (blob.size === 0) {
          setError('No audio captured — try again.')
          return
        }
        try {
          const base64 = await blobToBase64(blob)
          await onCompleteRef.current(base64, blob.type)
        } catch {
          setError('Failed to process recording.')
        }
      }

      mr.start()
      startedAtRef.current = Date.now()
      setRecording(true)
      setElapsedMs(0)

      // Tick elapsed time + auto-stop at maxMs
      tickRef.current = setInterval(() => {
        const elapsed = Date.now() - startedAtRef.current
        setElapsedMs(elapsed)
        if (elapsed >= maxMs) {
          // Stop automatically when the cap is hit
          try {
            mr.stop()
          } catch {
            /* swallow */
          }
        }
      }, 200)
    } catch (e: unknown) {
      const err = e as DOMException
      if (err?.name === 'NotAllowedError') {
        setError('Microphone permission denied. Please allow access in your browser.')
      } else if (err?.name === 'NotFoundError') {
        setError('No microphone found. Connect one and try again.')
      } else {
        setError('Could not start recording. Try again.')
      }
      cleanup()
    }
  }, [maxMs, cleanup])

  const stop = useCallback(() => {
    const mr = mediaRecorderRef.current
    if (mr && mr.state !== 'inactive') {
      try {
        mr.stop()
      } catch {
        /* swallow */
      }
    }
  }, [])

  const cancel = useCallback(() => {
    cancelRef.current = true
    const mr = mediaRecorderRef.current
    if (mr && mr.state !== 'inactive') {
      try {
        mr.stop()
      } catch {
        /* swallow */
      }
    } else {
      cleanup()
    }
  }, [cleanup])

  return { recording, elapsedMs, error, start, stop, cancel, clearError: () => setError(null) }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('FileReader did not return a string'))
        return
      }
      // Strip the data:audio/...;base64, prefix so the API receives raw base64.
      const commaIdx = result.indexOf(',')
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result)
    }
    reader.onerror = () => reject(reader.error ?? new Error('FileReader error'))
    reader.readAsDataURL(blob)
  })
}

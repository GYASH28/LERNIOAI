'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { SkipForward } from 'lucide-react'
import {
  HYPERFRAMES_INTRO_STORAGE_KEY,
  HYPERFRAMES_INTRO_TIMING,
} from '@/lib/motion/hyperframes-intro'

function hasSeenIntro() {
  try {
    return window.sessionStorage.getItem(HYPERFRAMES_INTRO_STORAGE_KEY) === 'complete'
  } catch {
    return false
  }
}

function markIntroSeen() {
  try {
    window.sessionStorage.setItem(HYPERFRAMES_INTRO_STORAGE_KEY, 'complete')
  } catch {
    // Session storage is optional. The intro still exits safely.
  }
}

function shouldReduceMotion() {
  const root = document.documentElement
  return (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    root.dataset.motion === 'reduced' ||
    root.dataset.motion === 'none'
  )
}

export function HyperframesIntro() {
  const [visible, setVisible] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [reduced, setReduced] = useState(false)
  const completeTimer = useRef<number | null>(null)
  const exitTimer = useRef<number | null>(null)

  const complete = useCallback(() => {
    if (completeTimer.current) window.clearTimeout(completeTimer.current)
    if (exitTimer.current) return

    markIntroSeen()
    setExiting(true)
    document.documentElement.dataset.landingIntro = 'handoff'

    exitTimer.current = window.setTimeout(() => {
      document.documentElement.dataset.landingIntro = 'complete'
      window.dispatchEvent(new CustomEvent('lernio:intro-complete'))
      setVisible(false)
      exitTimer.current = null
    }, 360)
  }, [])

  useEffect(() => {
    if (hasSeenIntro() || document.documentElement.dataset.landingIntro === 'complete') {
      document.documentElement.dataset.landingIntro = 'complete'
      return
    }

    const nextReduced = shouldReduceMotion()
    setReduced(nextReduced)
    setVisible(true)
    document.documentElement.dataset.landingIntro = 'playing'

    const duration = nextReduced
      ? HYPERFRAMES_INTRO_TIMING.reduced
      : HYPERFRAMES_INTRO_TIMING.full

    completeTimer.current = window.setTimeout(complete, duration + 900)

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type === 'lernio-hyperframes-complete') complete()
    }
    window.addEventListener('message', onMessage)

    return () => {
      window.removeEventListener('message', onMessage)
      if (completeTimer.current) window.clearTimeout(completeTimer.current)
      if (exitTimer.current) window.clearTimeout(exitTimer.current)
    }
  }, [complete])

  if (!visible) return null

  return (
    <div
      data-hyperframes-intro
      data-exiting={exiting ? 'true' : 'false'}
      className="fixed inset-0 z-[120] overflow-hidden bg-[#04050d] text-white transition duration-300 data-[exiting=true]:-translate-y-2 data-[exiting=true]:opacity-0"
      role="dialog"
      aria-label="Lernio opening sequence"
      aria-modal="true"
    >
      <iframe
        src={`/hyperframes/lernio-opening/index.html${reduced ? '?reduced=1' : ''}`}
        title="Lernio HyperFrames opening composition"
        className="absolute inset-0 h-full w-full border-0"
        sandbox="allow-scripts allow-same-origin"
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
        tabIndex={-1}
        aria-hidden="true"
      />

      {!loaded && (
        <div className="absolute inset-0 grid place-items-center bg-[#04050d] text-center">
          <div>
            <div className="mx-auto h-12 w-12 animate-pulse rounded-2xl bg-gradient-to-br from-cyan-400 via-violet-500 to-fuchsia-400 shadow-2xl shadow-violet-500/40" />
            <p className="mt-4 text-xs font-black uppercase tracking-[0.28em] text-cyan-200/80">
              Starting Lernio
            </p>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={complete}
        className="absolute right-4 top-4 z-20 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-black/35 px-4 text-xs font-bold text-white/90 backdrop-blur-md transition hover:bg-black/55 sm:right-6 sm:top-6"
      >
        Skip intro <SkipForward className="h-4 w-4" />
      </button>
    </div>
  )
}

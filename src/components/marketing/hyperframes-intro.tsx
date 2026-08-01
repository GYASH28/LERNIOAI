'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { SkipForward } from 'lucide-react'
import {
  HYPERFRAMES_INTRO_STORAGE_KEY,
  HYPERFRAMES_INTRO_TIMING,
} from '@/lib/motion/hyperframes-intro'
import styles from './hyperframes-intro.module.css'

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

const SYSTEM_CARDS = [
  ['01', 'Learn', 'Structured lessons and complete notes'],
  ['02', 'Watch', 'One reviewed video for the exact lesson'],
  ['03', 'Practise', 'Mistakes become the next useful task'],
  ['04', 'Ask LEO', 'Explain the same concept differently'],
] as const

export function HyperframesIntro() {
  const [visible, setVisible] = useState(false)
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
    }, 320)
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

    completeTimer.current = window.setTimeout(complete, duration + 240)

    return () => {
      if (completeTimer.current) window.clearTimeout(completeTimer.current)
      if (exitTimer.current) window.clearTimeout(exitTimer.current)
    }
  }, [complete])

  if (!visible) return null

  return (
    <div
      data-hyperframes-intro
      data-exiting={exiting ? 'true' : 'false'}
      className={`${styles.overlay} ${exiting ? styles.exiting : ''} ${
        reduced ? styles.reduced : ''
      }`}
      role="dialog"
      aria-label="Lernio opening sequence"
      aria-modal="true"
    >
      <div className={styles.stage} aria-hidden="true">
        <div className={styles.grid} />
        <div className={styles.beam} />

        <section className={`${styles.scene} ${styles.signalScene}`}>
          <div>
            <p className={styles.eyebrow}>Your learning system is coming online</p>
            <div className={styles.signalCore}>
              <div className={`${styles.ring} ${styles.ringOuter}`} />
              <div className={`${styles.ring} ${styles.ringMiddle}`} />
              <div className={`${styles.ring} ${styles.ringInner}`} />
              <div className={`${styles.pulseDot} ${styles.pulseOne}`} />
              <div className={`${styles.pulseDot} ${styles.pulseTwo}`} />
              <div className={styles.brandTile}>L</div>
            </div>
          </div>
        </section>

        <section className={`${styles.scene} ${styles.systemScene}`}>
          <div className={styles.systemWrap}>
            <p className={styles.eyebrow}>One connected academic workspace</p>
            <h2 className={styles.systemTitle}>Learn. Practise. Revise. Understand.</h2>
            <div className={styles.cards}>
              {SYSTEM_CARDS.map(([number, title, description]) => (
                <article key={number} className={styles.card}>
                  <div className={styles.cardNumber}>{number}</div>
                  <strong>{title}</strong>
                  <span>{description}</span>
                </article>
              ))}
            </div>
            <div className={styles.flowLine} />
          </div>
        </section>

        <section className={`${styles.scene} ${styles.identityScene}`}>
          <div className={styles.identityWrap}>
            <div className={styles.identityLogo}>L</div>
            <h2 className={styles.wordmark}>LERNIO</h2>
            <p className={styles.sub}>Learning OS</p>
            <p className={styles.tagline}>
              One place to learn, practise, revise, and understand what comes next.
            </p>
          </div>
        </section>

        <div className={styles.progressShell}>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} />
          </div>
          <div className={styles.progressLabels}>
            <span>Signal</span>
            <span>System</span>
            <span>Lernio</span>
          </div>
        </div>
      </div>

      <button type="button" onClick={complete} className={styles.skip}>
        Skip intro <SkipForward className="h-4 w-4" />
      </button>
    </div>
  )
}

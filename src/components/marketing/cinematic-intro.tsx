'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { RotateCcw, SkipForward } from 'lucide-react'
import {
  LANDING_INTRO_STORAGE_KEY,
  introDurationMs,
  resolveLandingIntroMode,
  type LandingIntroMode,
} from '@/lib/motion/landing-intro'

type Phase = 'checking' | 'playing' | 'exiting' | 'complete'

type Particle = {
  x: number
  y: number
  size: number
  drift: number
  alpha: number
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - clamp01(value), 3)
}

function easeInOutCubic(value: number) {
  const t = clamp01(value)
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function createParticles(count: number, width: number, height: number): Particle[] {
  let seed = 321947
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }

  return Array.from({ length: count }, () => ({
    x: random() * width,
    y: random() * height,
    size: 0.7 + random() * 1.8,
    drift: random() * Math.PI * 2,
    alpha: 0.25 + random() * 0.7,
  }))
}

function drawBook(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  openness: number,
  pulse: number,
) {
  context.save()
  context.translate(x, y)
  context.scale(scale, scale)

  const spread = 80 * openness
  const pageLift = 18 * openness

  // ─── Book shadow ───
  context.save()
  context.fillStyle = 'rgba(0, 0, 0, 0.3)'
  context.filter = 'blur(12px)'
  context.beginPath()
  context.ellipse(0, 90, 130 + spread * 0.5, 16, 0, 0, Math.PI * 2)
  context.fill()
  context.restore()

  // ─── Pages (cream colored) — no dark cover behind them ───
  context.save()
  context.shadowColor = 'rgba(6, 182, 212, 0.25)'
  context.shadowBlur = 20 + pulse * 8
  context.shadowOffsetY = 6

  const pageGradient = context.createLinearGradient(-120, -50, 120, 70)
  pageGradient.addColorStop(0, '#FFFEF7')
  pageGradient.addColorStop(0.5, '#FFF9E8')
  pageGradient.addColorStop(1, '#F5EFD5')
  context.fillStyle = pageGradient

  // Left page
  context.beginPath()
  context.moveTo(0, 10)
  context.bezierCurveTo(-30, -18 - pageLift, -80 - spread, -45, -135 - spread, -8)
  context.lineTo(-122 - spread, 78)
  context.bezierCurveTo(-68 - spread, 50, -28, 62, 0, 78)
  context.closePath()
  context.fill()

  // Right page
  context.beginPath()
  context.moveTo(0, 10)
  context.bezierCurveTo(30, -18 - pageLift, 80 + spread, -45, 135 + spread, -8)
  context.lineTo(122 + spread, 78)
  context.bezierCurveTo(68 + spread, 50, 28, 62, 0, 78)
  context.closePath()
  context.fill()
  context.restore()

  // ─── Page border ───
  context.strokeStyle = 'rgba(180, 160, 100, 0.3)'
  context.lineWidth = 1.5
  context.beginPath()
  context.moveTo(0, 10)
  context.bezierCurveTo(-30, -18 - pageLift, -80 - spread, -45, -135 - spread, -8)
  context.lineTo(-122 - spread, 78)
  context.bezierCurveTo(-68 - spread, 50, -28, 62, 0, 78)
  context.stroke()

  context.beginPath()
  context.moveTo(0, 10)
  context.bezierCurveTo(30, -18 - pageLift, 80 + spread, -45, 135 + spread, -8)
  context.lineTo(122 + spread, 78)
  context.bezierCurveTo(68 + spread, 50, 28, 62, 0, 78)
  context.stroke()

  // ─── Center line (subtle, where pages meet) ───
  context.strokeStyle = 'rgba(120, 100, 60, 0.2)'
  context.lineWidth = 1
  context.beginPath()
  context.moveTo(0, 10)
  context.lineTo(0, 78)
  context.stroke()

  // ─── Text lines on pages ───
  context.save()
  context.shadowBlur = 0
  context.strokeStyle = 'rgba(120, 100, 60, 0.3)'
  context.lineWidth = 1

  // Left page lines
  for (let i = 0; i < 6; i += 1) {
    const yPos = -20 + i * 14
    const widthFactor = 0.75 + (i % 2) * 0.15
    context.beginPath()
    context.moveTo(-110 - spread * 0.9, yPos)
    context.lineTo(-110 - spread * 0.9 + 95 * widthFactor, yPos)
    context.stroke()
  }

  // Right page lines
  for (let i = 0; i < 6; i += 1) {
    const yPos = -20 + i * 14
    const widthFactor = 0.75 + (i % 2) * 0.15
    context.beginPath()
    context.moveTo(110 + spread * 0.9 - 95 * widthFactor, yPos)
    context.lineTo(110 + spread * 0.9, yPos)
    context.stroke()
  }

  // ─── Page heading (left page) ───
  context.fillStyle = 'rgba(14, 116, 144, 0.8)'
  context.font = 'bold 10px system-ui, sans-serif'
  context.textAlign = 'left'
  context.fillText('DATA STRUCTURES', -115 - spread * 0.9, -35)

  // ─── Code block (right page) ───
  context.fillStyle = 'rgba(14, 116, 144, 0.12)'
  context.fillRect(20 + spread * 0.9, 5, 80, 35)
  context.fillStyle = 'rgba(14, 116, 144, 0.7)'
  context.font = '8px "Courier New", monospace'
  context.fillText('const arr = []', 25 + spread * 0.9, 18)
  context.fillText('arr.push(42)', 25 + spread * 0.9, 30)

  context.restore()

  // ─── Bookmark ribbon ───
  context.save()
  context.fillStyle = '#8B5CF6'
  context.shadowColor = 'rgba(139, 92, 246, 0.5)'
  context.shadowBlur = 8
  context.beginPath()
  context.moveTo(40 + spread * 0.3, -45)
  context.lineTo(50 + spread * 0.3, -45)
  context.lineTo(50 + spread * 0.3, -5)
  context.lineTo(45 + spread * 0.3, -12)
  context.lineTo(40 + spread * 0.3, -5)
  context.closePath()
  context.fill()
  context.restore()

  context.restore()
}

function drawFrame(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
  particles: Particle[],
) {
  context.clearRect(0, 0, width, height)

  // ─── Rich gradient background ───
  const background = context.createRadialGradient(width * 0.5, height * 0.42, 0, width * 0.5, height * 0.5, Math.max(width, height))
  background.addColorStop(0, '#0E7490')
  background.addColorStop(0.15, '#0F172A')
  background.addColorStop(0.5, '#020617')
  background.addColorStop(1, '#000000')
  context.fillStyle = background
  context.fillRect(0, 0, width, height)

  // ─── Subtle grid ───
  context.strokeStyle = 'rgba(6, 182, 212, 0.04)'
  context.lineWidth = 1
  const grid = Math.max(42, Math.min(64, width / 18))
  for (let x = 0; x < width; x += grid) {
    context.beginPath()
    context.moveTo(x, 0)
    context.lineTo(x, height)
    context.stroke()
  }
  for (let y = 0; y < height; y += grid) {
    context.beginPath()
    context.moveTo(0, y)
    context.lineTo(width, y)
    context.stroke()
  }

  // ─── Glowing orbs in background ───
  const orbProgress = easeInOutCubic(progress)
  context.save()
  context.globalAlpha = 0.3 * orbProgress
  const orb1 = context.createRadialGradient(width * 0.2, height * 0.3, 0, width * 0.2, height * 0.3, 200)
  orb1.addColorStop(0, 'rgba(6, 182, 212, 0.6)')
  orb1.addColorStop(1, 'rgba(6, 182, 212, 0)')
  context.fillStyle = orb1
  context.fillRect(0, 0, width, height)

  const orb2 = context.createRadialGradient(width * 0.8, height * 0.7, 0, width * 0.8, height * 0.7, 200)
  orb2.addColorStop(0, 'rgba(139, 92, 246, 0.5)')
  orb2.addColorStop(1, 'rgba(139, 92, 246, 0)')
  context.fillStyle = orb2
  context.fillRect(0, 0, width, height)
  context.restore()

  // ─── Particles converging ───
  const convergence = easeInOutCubic((progress - 0.08) / 0.34)
  const centerX = width * 0.5
  const centerY = height * 0.46

  for (const particle of particles) {
    const orbit = 24 + Math.sin(particle.drift + progress * 8) * 14
    const targetX = centerX + Math.cos(particle.drift * 2.3) * orbit
    const targetY = centerY + Math.sin(particle.drift * 1.8) * orbit * 0.55
    const x = particle.x + (targetX - particle.x) * convergence
    const y = particle.y + (targetY - particle.y) * convergence
    context.fillStyle = `rgba(6, 182, 212, ${particle.alpha * (0.4 + 0.6 * convergence)})`
    context.beginPath()
    context.arc(x, y, particle.size, 0, Math.PI * 2)
    context.fill()
  }

  // ─── The 3D Book ───
  const bookProgress = easeOutCubic((progress - 0.22) / 0.32)
  if (bookProgress > 0) {
    const handoff = easeInOutCubic((progress - 0.84) / 0.16)
    const target = document.querySelector<HTMLElement>('[data-hero-book]')
    const rect = target?.getBoundingClientRect()
    const targetX = rect ? rect.left + rect.width / 2 : centerX
    const targetY = rect ? rect.top + rect.height / 2 : centerY
    const x = centerX + (targetX - centerX) * handoff
    const y = centerY + (targetY - centerY) * handoff
    const baseScale = Math.min(width / 880, height / 620)
    const targetScale = rect ? Math.min(rect.width / 520, rect.height / 380) : baseScale
    const scale = (baseScale + (targetScale - baseScale) * handoff) * (0.72 + bookProgress * 0.28)
    drawBook(context, x, y, scale, bookProgress, (Math.sin(progress * 28) + 1) / 2)
  }

  // ─── Wordmark ───
  const wordmark = easeOutCubic((progress - 0.64) / 0.18) * (1 - easeInOutCubic((progress - 0.86) / 0.12))
  if (wordmark > 0) {
    context.save()
    context.globalAlpha = wordmark
    context.textAlign = 'center'
    context.fillStyle = '#f0f9ff'
    context.font = `900 ${Math.max(42, Math.min(82, width * 0.065))}px system-ui, sans-serif`
    context.fillText('LERNIO', centerX, height * 0.78)

    context.fillStyle = 'rgba(6, 182, 212, 0.9)'
    context.font = `700 ${Math.max(11, Math.min(16, width * 0.015))}px system-ui, sans-serif`
    context.fillText('CWIT ACADEMIC INTELLIGENCE OS', centerX, height * 0.83)

    // Tagline
    context.fillStyle = 'rgba(148, 163, 184, 0.7)'
    context.font = `400 ${Math.max(10, Math.min(14, width * 0.013))}px system-ui, sans-serif`
    context.fillText('Understand faster. Practise smarter. Walk into exams prepared.', centerX, height * 0.87)
    context.restore()
  }
}

function safeHasSeen() {
  try {
    return window.sessionStorage.getItem(LANDING_INTRO_STORAGE_KEY) === 'complete'
  } catch {
    return false
  }
}

function safeMarkSeen() {
  try {
    window.sessionStorage.setItem(LANDING_INTRO_STORAGE_KEY, 'complete')
  } catch {
    // Storage is optional. The experience still completes safely.
  }
}

export function CinematicIntro() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<number | null>(null)
  const finishingRef = useRef(false)
  const [phase, setPhase] = useState<Phase>('checking')
  const [mode, setMode] = useState<LandingIntroMode>('full')
  const [runId, setRunId] = useState(0)
  const [stage, setStage] = useState('Awakening academic intelligence')
  const stageRef = useRef(stage)

  const announceComplete = useCallback(() => {
    document.documentElement.dataset.landingIntro = 'complete'
    window.dispatchEvent(new CustomEvent('lernio:intro-complete'))
  }, [])

  const finish = useCallback(() => {
    if (finishingRef.current) return
    finishingRef.current = true
    safeMarkSeen()
    announceComplete()
    setPhase('exiting')
    window.setTimeout(() => {
      setPhase('complete')
      finishingRef.current = false
    }, 620)
  }, [announceComplete])

  useEffect(() => {
    // SAFETY NET: If the intro is still in 'checking' phase after 3 seconds,
    // force it to complete. This prevents the app from being stuck on a
    // blank loading screen if the useEffect below fails for any reason.
    if (phase !== 'checking') return
    const safetyTimer = setTimeout(() => {
      if (phase === 'checking') {
        safeMarkSeen()
        announceComplete()
        setPhase('complete')
      }
    }, 3000)
    return () => clearTimeout(safetyTimer)
  }, [announceComplete, phase])

  useEffect(() => {
    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string }
      deviceMemory?: number
    })
    const replaying = runId > 0
    const resolved = replaying
      ? 'full'
      : resolveLandingIntroMode({
          hasSeenIntro: safeHasSeen(),
          prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
          motionPreference:
            document.documentElement.dataset.motion === 'none'
              ? 'none'
              : document.documentElement.dataset.motion === 'reduced'
                ? 'reduced'
                : 'full',
          lowPower: document.documentElement.dataset.lowPower === 'true',
          saveData: connection.connection?.saveData === true,
          effectiveType: connection.connection?.effectiveType,
          deviceMemory: connection.deviceMemory,
        })

    setMode(resolved)

    if (resolved === 'skip') {
      safeMarkSeen()
      announceComplete()
      setPhase('complete')
      return
    }

    document.documentElement.dataset.landingIntro = 'playing'
    const initialStage = resolved === 'reduced' ? 'Opening Lernio' : 'Awakening academic intelligence'
    stageRef.current = initialStage
    setStage(initialStage)
    setPhase('playing')
  }, [announceComplete, runId])

  useEffect(() => {
    if (phase !== 'playing' || mode === 'skip') return

    // SAFETY NET: Force-complete the intro after max duration + 3 seconds.
    // This prevents the app from being stuck if requestAnimationFrame fails.
    const maxDuration = introDurationMs(mode, window.innerWidth) + 3000
    const forceCompleteTimer = setTimeout(() => {
      finish()
    }, maxDuration)

    const canvas = canvasRef.current
    if (!canvas) {
      clearTimeout(forceCompleteTimer)
      finish()
      return
    }
    const context = canvas.getContext('2d', { alpha: false })
    if (!context) {
      clearTimeout(forceCompleteTimer)
      finish()
      return
    }

    let width = 0
    let height = 0
    let startedAt = performance.now()
    let pausedAt = 0
    let particles: Particle[] = []
    const duration = introDurationMs(mode, window.innerWidth)

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.max(1, Math.floor(width * dpr))
      canvas.height = Math.max(1, Math.floor(height * dpr))
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      particles = createParticles(mode === 'full' ? (width < 640 ? 68 : 126) : 44, width, height)
    }

    const onVisibility = () => {
      if (document.hidden) {
        pausedAt = performance.now()
      } else if (pausedAt) {
        startedAt += performance.now() - pausedAt
        pausedAt = 0
      }
    }

    const render = (now: number) => {
      if (document.hidden) {
        frameRef.current = window.requestAnimationFrame(render)
        return
      }

      const progress = clamp01((now - startedAt) / duration)
      const visualProgress = mode === 'reduced' ? 0.74 : progress
      drawFrame(context, width, height, visualProgress, particles)

      const nextStage =
        progress < 0.18
          ? 'Academic data converging'
          : progress < 0.48
            ? 'Knowledge book forming'
            : progress < 0.68
              ? 'Intelligence core activating'
              : progress < 0.86
                ? 'Lernio ready'
                : 'Entering your learning system'
      if (stageRef.current !== nextStage) {
        stageRef.current = nextStage
        setStage(nextStage)
      }

      if (progress >= 1) {
        finish()
        return
      }
      frameRef.current = window.requestAnimationFrame(render)
    }

    resize()
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVisibility)
    frameRef.current = window.requestAnimationFrame(render)

    return () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
      clearTimeout(forceCompleteTimer)
    }
  }, [finish, mode, phase])

  useEffect(() => {
    if (phase !== 'playing') return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [finish, phase])

  const replay = () => {
    finishingRef.current = false
    setPhase('checking')
    setRunId((value) => value + 1)
  }

  if (phase === 'complete') {
    return (
      <button type="button" className="cinematic-intro-replay" onClick={replay}>
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        Replay intro
      </button>
    )
  }

  return (
    <div
      className={`cinematic-intro ${phase === 'exiting' ? 'cinematic-intro--exiting' : ''}`}
      role="dialog"
      aria-label="Lernio cinematic introduction"
      aria-modal="false"
    >
      <canvas ref={canvasRef} className="cinematic-intro__canvas" aria-hidden="true" />
      <div className="cinematic-intro__grain" aria-hidden="true" />
      <p className="cinematic-intro__status" aria-live="polite">{stage}</p>
      <button type="button" className="cinematic-intro__skip" onClick={finish}>
        <SkipForward className="h-4 w-4" aria-hidden="true" />
        Skip intro
      </button>
    </div>
  )
}

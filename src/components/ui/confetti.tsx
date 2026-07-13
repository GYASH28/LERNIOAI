'use client'

/**
 * Confetti — reusable celebration overlay for LERNIO gamification.
 *
 * Use cases: achievement unlock, quiz completion, streak saved,
 * lesson finished, daily-goal hit.
 *
 * Usage:
 *   const [burst, setBurst] = useState(0)
 *   <Confetti trigger={burst} />
 *   <button onClick={() => setBurst(b => b + 1)}>Celebrate</button>
 *
 * The component is purely additive — it renders `position: fixed`
 * with `pointer-events: none` and `z-index: 9999`, so it overlays
 * everything without capturing clicks. Pieces auto-clean after the
 * duration elapses.
 *
 * Colours pull from the semantic chart tokens (--chart-1 .. --chart-5)
 * so the celebration matches the active palette automatically.
 */

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'

interface ConfettiProps {
  /** Increment to fire a new burst. The same value won't re-fire. */
  trigger: number
  /** How long the celebration lasts (ms). Default 3000. */
  duration?: number
  /** Number of confetti pieces. Default 48. */
  pieceCount?: number
}

interface ConfettiPiece {
  id: number
  /** Horizontal start position as a percentage of viewport width. */
  startX: number
  /** Horizontal drift over the fall, in vw units. */
  drift: number
  /** Size in px. */
  size: number
  /** Chart-token colour index (1..5). */
  colorIndex: 1 | 2 | 3 | 4 | 5
  /** Initial rotation in degrees. */
  rotateStart: number
  /** Total rotation over the fall, in degrees. */
  rotateEnd: number
  /** Fall delay so pieces don't all start at once. */
  delay: number
  /** Fall duration (slightly varied for realism). */
  fallDuration: number
}

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
] as const

function buildPieces(count: number): ConfettiPiece[] {
  // Deterministic-ish randomisation with enough chaos to look festive.
  return Array.from({ length: count }, (_, i) => {
    const colorIndex = ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5
    return {
      id: i,
      startX: Math.random() * 100,
      drift: (Math.random() - 0.5) * 40, // -20vw .. +20vw
      size: 8 + Math.round(Math.random() * 4), // 8..12px
      colorIndex,
      rotateStart: Math.random() * 360,
      rotateEnd: (Math.random() - 0.5) * 720, // -360..+360deg
      delay: Math.random() * 250,
      fallDuration: 2200 + Math.random() * 900, // 2.2s .. 3.1s
    }
  })
}

export function Confetti({ trigger, duration = 3000, pieceCount = 48 }: ConfettiProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([])
  const [activeKey, setActiveKey] = useState<number>(0)

  // Fire a new burst whenever `trigger` increments.
  useEffect(() => {
    if (trigger <= 0) return
    const next = buildPieces(pieceCount)
    setPieces(next)
    setActiveKey(trigger)

    const cleanup = window.setTimeout(() => {
      setPieces([])
    }, duration)

    return () => {
      window.clearTimeout(cleanup)
    }
  }, [trigger, pieceCount, duration])

  // Memoise the colour lookup so we don't allocate per-render.
  const colorFor = useMemo(
    () => (idx: 1 | 2 | 3 | 4 | 5) => CHART_COLORS[idx - 1],
    [],
  )

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9999,
        overflow: 'hidden',
      }}
    >
      <AnimatePresence>
        {pieces.length > 0 && (
          <motion.div
            key={`burst-${activeKey}`}
            style={{ position: 'absolute', inset: 0 }}
          >
            {pieces.map((piece) => (
              <motion.span
                key={`${activeKey}-${piece.id}`}
                style={{
                  position: 'absolute',
                  top: -20,
                  left: `${piece.startX}vw`,
                  width: piece.size,
                  height: piece.size,
                  borderRadius: 2,
                  backgroundColor: colorFor(piece.colorIndex),
                  // Slight 3D feel — the rounded square reads as a
                  // tumbling piece of paper.
                  boxShadow: '0 0 0 1px oklch(1 0 0 / 0.08)',
                }}
                initial={{
                  y: -40,
                  x: 0,
                  opacity: 1,
                  rotate: piece.rotateStart,
                }}
                animate={{
                  // Fall the full viewport height plus a margin so
                  // pieces exit cleanly below the fold.
                  y: typeof window !== 'undefined' ? window.innerHeight + 60 : 1000,
                  x: piece.drift,
                  opacity: [1, 1, 0.9, 0],
                  rotate: piece.rotateEnd,
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: piece.fallDuration / 1000,
                  delay: piece.delay / 1000,
                  // Gravity-like easing: slow start, fast finish.
                  ease: [0.22, 0.61, 0.36, 1],
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Confetti

'use client'

/* ============================================================
   LeoPremium — the emotional identity of Learnio.
   ------------------------------------------------------------
   A floating glassmorphism orb with a gradient brand core,
   subtle inner glow, and a face that reacts to context.

   Design language: Apple's Siri orb × Linear's loading dot.
   Premium, intelligent, friendly — not cartoonish.

   • Palette-aware — every colour is a semantic OKLCH token
     (--brand, --brand-soft, --brand-active, --text-inverse,
      --surface-elevated) so the orb recolours itself per theme.
   • Motion-aware — honors the app's reducedMotion / lowPower
     prefs AND the OS prefers-reduced-motion signal.
   • Crisp rendering — the orb + face are SVG; ambient glow,
     pulse rings and celebration particles are composed from
     absolutely-positioned motion divs.
   • Accessible — role="img" with a state-aware aria-label, or
     aria-hidden when used decoratively.
   ============================================================ */

import { useId, useMemo, type ReactNode } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { usePrefs } from '@/components/theme-provider'

const SIZE_MAP = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
  '2xl': 128,
} as const

export interface LeoPremiumProps {
  state?:
    | 'idle'
    | 'thinking'
    | 'happy'
    | 'encouraging'
    | 'curious'
    | 'celebrating'
    | 'sad'
    | 'greeting'
  size?: keyof typeof SIZE_MAP
  className?: string
  /** Ambient glow ring around the orb. */
  withGlow?: boolean
  /** Gentle floating animation. */
  withFloat?: boolean
  /** Override the auto-generated accessible label. Pass an empty
   *  string to mark the mascot as decorative (aria-hidden). */
  ariaLabel?: string
}

type LeoState = NonNullable<LeoPremiumProps['state']>

const STATE_LABELS: Record<LeoState, string> = {
  idle: 'LEO, your AI tutor, is here and ready',
  thinking: 'LEO is thinking',
  happy: 'LEO is happy',
  encouraging: 'LEO is encouraging you',
  curious: 'LEO is curious',
  celebrating: 'LEO is celebrating your achievement',
  sad: 'LEO looks concerned',
  greeting: 'LEO is waving hello',
}

/* ---------- Celebration burst: 8 dots radiating outward ---------- */
const PARTICLE_DIRECTIONS = Array.from({ length: 8 }, (_, i) => {
  const angle = (i / 8) * Math.PI * 2 - Math.PI / 2
  return { x: Math.cos(angle), y: Math.sin(angle) }
})

/* A tasteful celebratory palette drawn from the semantic tokens. */
const PARTICLE_COLORS = [
  'var(--brand)',
  'var(--success)',
  'var(--warning)',
  'var(--info)',
  'var(--secondary-action)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

export function LeoPremium({
  state = 'idle',
  size = 'md',
  className,
  withGlow = true,
  withFloat = true,
  ariaLabel,
}: LeoPremiumProps) {
  const px = SIZE_MAP[size]
  const reactId = useId()
  // React's useId() returns strings containing ':' which are invalid in
  // SVG ids / url() references — strip them.
  const uid = `leo-${reactId.replace(/[^a-zA-Z0-9-]/g, '')}`

  const prefersReduced = useReducedMotion()
  const { pref } = usePrefs()
  const reducedMotion =
    !!prefersReduced || !!pref?.reducedMotion || !!pref?.lowPower

  const canFloat = withFloat && !reducedMotion
  const canBehave = !reducedMotion

  /* ---------- Floating ---------- */
  const floatTransition = canFloat
    ? { duration: 3, repeat: Infinity, ease: 'easeInOut' as const }
    : { duration: 0 }

  /* ---------- Behaviour per state (applied to an inner wrapper) ---------- */
  const behaviour = useMemo(() => {
    if (!canBehave) return { animate: { opacity: 1 }, transition: { duration: 0 } }
    switch (state) {
      case 'thinking':
        return {
          animate: { scale: [1, 1.05, 1] },
          transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' as const },
        }
      case 'happy':
        return {
          animate: { y: [0, -2, 0] },
          transition: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' as const },
        }
      case 'encouraging':
        return {
          animate: { rotate: [-2, 2, -2] },
          transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' as const },
        }
      case 'curious':
        return {
          animate: { scale: [1, 1.04, 1], y: [0, 1, 0] },
          transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' as const },
        }
      case 'celebrating':
        return {
          animate: { y: [0, -8, 0] },
          transition: { duration: 0.7, repeat: Infinity, ease: 'easeInOut' as const },
        }
      case 'sad':
        return {
          animate: { y: [0, 2, 0] },
          transition: { duration: 3.4, repeat: Infinity, ease: 'easeInOut' as const },
        }
      case 'greeting':
        return {
          animate: { rotate: [-8, 8, -6, 6, 0] },
          transition: {
            duration: 1.4,
            repeat: Infinity,
            repeatDelay: 1.6,
            ease: 'easeInOut' as const,
          },
        }
      default:
        return { animate: { opacity: 1 }, transition: { duration: 0 } }
    }
  }, [state, canBehave])

  /* ---------- Ambient glow intensity per state ---------- */
  const glow = useMemo(() => {
    switch (state) {
      case 'thinking':
        return {
          opacity: canBehave ? [0.5, 0.85, 0.5] : 0.7,
          scale: canBehave ? [1, 1.12, 1] : 1,
          transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' as const },
        }
      case 'celebrating':
        return {
          opacity: canBehave ? [0.75, 1, 0.75] : 0.95,
          scale: canBehave ? [1.1, 1.3, 1.1] : 1.2,
          transition: { duration: 0.9, repeat: Infinity, ease: 'easeInOut' as const },
        }
      case 'happy':
      case 'greeting':
        return { opacity: 0.85, scale: 1.1, transition: { duration: 0.4 } }
      case 'encouraging':
        return { opacity: 0.8, scale: 1.08, transition: { duration: 0.4 } }
      case 'curious':
        return { opacity: 0.7, scale: 1.05, transition: { duration: 0.4 } }
      case 'sad':
        return { opacity: 0.32, scale: 0.94, transition: { duration: 0.4 } }
      default:
        return { opacity: 0.6, scale: 1, transition: { duration: 0.4 } }
    }
  }, [state, canBehave])

  const isDecorative = ariaLabel === ''
  const label = isDecorative ? undefined : ariaLabel ?? STATE_LABELS[state]

  return (
    <motion.div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: px, height: px }}
      animate={canFloat ? { y: [0, -6, 0] } : { y: 0 }}
      transition={floatTransition}
      role={isDecorative ? undefined : 'img'}
      aria-label={label}
      aria-hidden={isDecorative ? true : undefined}
    >
      {/* ---------- Ambient glow ring (blurred, palette-aware) ---------- */}
      {withGlow && (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background:
              'radial-gradient(circle, color-mix(in oklch, var(--brand) 32%, transparent) 0%, color-mix(in oklch, var(--brand) 12%, transparent) 45%, transparent 72%)',
            filter: `blur(${Math.max(4, px * 0.14)}px)`,
          }}
          animate={{ opacity: glow.opacity, scale: glow.scale }}
          transition={glow.transition}
        />
      )}

      {/* ---------- Behaviour wrapper (pulse / wave / bounce / sway) ---------- */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        animate={behaviour.animate}
        transition={behaviour.transition}
      >
        <LeoOrb uid={uid} state={state} size={px} canAnimate={canBehave} />
      </motion.div>

      {/* ---------- Celebration particle burst ---------- */}
      <AnimatePresence>
        {state === 'celebrating' && canBehave ? <CelebrationBurst size={px} /> : null}
      </AnimatePresence>
    </motion.div>
  )
}

/* ============================================================
   LeoOrb — the SVG body: gradient orb, antenna, glass rim,
   highlight, and a crossfading face.
   ============================================================ */
function LeoOrb({
  uid,
  state,
  size,
  canAnimate,
}: {
  uid: string
  state: LeoState
  size: number
  canAnimate: boolean
}) {
  const orbFill = `url(#${uid}-orb)`
  const auraFill = `url(#${uid}-aura)`
  const highlightFill = `url(#${uid}-highlight)`

  const antennaPulse =
    canAnimate && (state === 'thinking' || state === 'celebrating')

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className="block"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Orb body — brand-soft (top-left light) → brand (mid) → brand-active (bottom-right depth) */}
        <radialGradient id={`${uid}-orb`} cx="38%" cy="30%" r="80%">
          <stop offset="0%" stopColor="var(--brand-soft)" />
          <stop offset="50%" stopColor="var(--brand)" />
          <stop offset="100%" stopColor="var(--brand-active)" />
        </radialGradient>
        {/* Soft halo bleeding just past the orb rim */}
        <radialGradient id={`${uid}-aura`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--brand-soft)" stopOpacity="0.5" />
          <stop offset="60%" stopColor="var(--brand)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
        </radialGradient>
        {/* Glass reflection highlight (top-left) */}
        <radialGradient id={`${uid}-highlight`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--text-inverse)" stopOpacity="0.45" />
          <stop offset="65%" stopColor="var(--text-inverse)" stopOpacity="0.08" />
          <stop offset="100%" stopColor="var(--text-inverse)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Outer halo (sits behind the orb) */}
      <circle cx="60" cy="62" r="46" fill={auraFill} />

      {/* Antenna */}
      <line
        x1="60"
        y1="24"
        x2="60"
        y2="12"
        stroke="var(--brand)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.85"
      />
      <motion.circle
        cx="60"
        cy="10"
        r="3.6"
        fill="var(--brand-soft)"
        stroke="var(--brand)"
        strokeWidth="0.6"
        animate={
          antennaPulse
            ? state === 'celebrating'
              ? { opacity: [0.8, 1, 0.8], scale: [1, 1.4, 1] }
              : { opacity: [0.55, 1, 0.55], scale: [1, 1.25, 1] }
            : { opacity: 0.85, scale: 1 }
        }
        transition={
          antennaPulse
            ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.3 }
        }
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      />

      {/* Main orb body */}
      <circle cx="60" cy="62" r="38" fill={orbFill} />

      {/* Inner contour ring — adds depth */}
      <circle
        cx="60"
        cy="62"
        r="33"
        fill="none"
        stroke="var(--brand-active)"
        strokeOpacity="0.28"
        strokeWidth="0.75"
      />

      {/* Glass rim — crisp edge definition */}
      <circle
        cx="60"
        cy="62"
        r="38"
        fill="none"
        stroke="var(--text-inverse)"
        strokeOpacity="0.3"
        strokeWidth="1"
      />

      {/* Glass highlight (top-left reflection) */}
      <ellipse cx="48" cy="46" rx="20" ry="11" fill={highlightFill} />

      {/* Face — crossfades between states (250ms) */}
      <AnimatePresence>
        <motion.g
          key={state}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.08 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        >
          <LeoFace state={state} canAnimate={canAnimate} />
        </motion.g>
      </AnimatePresence>
    </svg>
  )
}

/* ============================================================
   LeoFace — eyes + expressive mouth, per state.
   Rendered inside the 120×120 viewBox, face centred on ~(60, 62).
   ============================================================ */
function LeoFace({ state, canAnimate }: { state: LeoState; canAnimate: boolean }) {
  const eye = 'var(--text-inverse)'
  const mouth = 'var(--text-inverse)'
  const fontStack =
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

  let eyes: ReactNode
  switch (state) {
    case 'thinking':
      eyes = (
        <>
          <motion.circle
            cx={50}
            cy={58}
            r={3.4}
            fill={eye}
            animate={canAnimate ? { scaleY: [1, 1, 0.1, 1, 1] } : {}}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: 'easeInOut',
              times: [0, 0.65, 0.74, 0.82, 1],
            }}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          />
          <motion.circle
            cx={70}
            cy={58}
            r={3.4}
            fill={eye}
            animate={canAnimate ? { scaleY: [1, 1, 0.1, 1, 1] } : {}}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: 'easeInOut',
              times: [0, 0.65, 0.74, 0.82, 1],
            }}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          />
        </>
      )
      break
    case 'happy':
    case 'greeting':
      // Happy arcs ^ ^
      eyes = (
        <>
          <path
            d="M 45 59 Q 50 53 55 59"
            stroke={eye}
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 65 59 Q 70 53 75 59"
            stroke={eye}
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
        </>
      )
      break
    case 'celebrating':
      // Bigger, brighter happy arcs
      eyes = (
        <>
          <path
            d="M 44 60 Q 50 52 56 60"
            stroke={eye}
            strokeWidth="3.2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 64 60 Q 70 52 76 60"
            stroke={eye}
            strokeWidth="3.2"
            fill="none"
            strokeLinecap="round"
          />
        </>
      )
      break
    case 'curious':
      // Question-mark eyes
      eyes = (
        <>
          <text
            x="46"
            y="63"
            fontSize="12"
            fontWeight="700"
            fill={eye}
            fontFamily={fontStack}
            textAnchor="middle"
          >
            ?
          </text>
          <text
            x="72"
            y="63"
            fontSize="12"
            fontWeight="700"
            fill={eye}
            fontFamily={fontStack}
            textAnchor="middle"
          >
            ?
          </text>
        </>
      )
      break
    case 'sad':
      eyes = (
        <>
          <circle cx="50" cy="58" r="3" fill={eye} opacity="0.85" />
          <circle cx="70" cy="58" r="3" fill={eye} opacity="0.85" />
        </>
      )
      break
    case 'encouraging':
      // Soft capsule eyes
      eyes = (
        <>
          <rect x="47.5" y="54" width="5" height="9" rx="2.5" fill={eye} opacity="0.92" />
          <rect x="67.5" y="54" width="5" height="9" rx="2.5" fill={eye} opacity="0.92" />
        </>
      )
      break
    default: // idle
      eyes = (
        <>
          <rect x="47.5" y="54" width="5" height="9" rx="2.5" fill={eye} />
          <rect x="67.5" y="54" width="5" height="9" rx="2.5" fill={eye} />
        </>
      )
  }

  let mouthEl: ReactNode
  switch (state) {
    case 'thinking':
      mouthEl = (
        <circle
          cx="60"
          cy="74"
          r="2.4"
          fill="none"
          stroke={mouth}
          strokeWidth="2"
        />
      )
      break
    case 'happy':
      mouthEl = (
        <path
          d="M 50 70 Q 60 78 70 70"
          stroke={mouth}
          strokeWidth="2.6"
          fill="none"
          strokeLinecap="round"
        />
      )
      break
    case 'greeting':
      mouthEl = (
        <path
          d="M 51 70 Q 60 77 69 70"
          stroke={mouth}
          strokeWidth="2.6"
          fill="none"
          strokeLinecap="round"
        />
      )
      break
    case 'celebrating':
      mouthEl = (
        <>
          <path d="M 48 68 Q 60 84 72 68 Z" fill={mouth} opacity="0.92" />
          <path
            d="M 52 72 Q 60 78 68 72"
            stroke="var(--brand-active)"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
        </>
      )
      break
    case 'encouraging':
      mouthEl = (
        <path
          d="M 49 71 Q 60 76 71 71"
          stroke={mouth}
          strokeWidth="2.6"
          fill="none"
          strokeLinecap="round"
        />
      )
      break
    case 'curious':
      mouthEl = (
        <path
          d="M 53 72 Q 60 75 67 72"
          stroke={mouth}
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
        />
      )
      break
    case 'sad':
      mouthEl = (
        <path
          d="M 52 76 Q 60 71 68 76"
          stroke={mouth}
          strokeWidth="2.6"
          fill="none"
          strokeLinecap="round"
        />
      )
      break
    default: // idle
      mouthEl = (
        <path
          d="M 52 71 Q 60 74 68 71"
          stroke={mouth}
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
          opacity="0.9"
        />
      )
  }

  return (
    <g>
      {eyes}
      {mouthEl}
    </g>
  )
}

/* ============================================================
   CelebrationBurst — 8 dots radiating outward, staggered,
   drawn from the semantic palette for a tasteful rainbow.
   ============================================================ */
function CelebrationBurst({ size }: { size: number }) {
  const dotSize = Math.max(4, Math.round(size * 0.08))
  const distance = size * 0.55

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {PARTICLE_DIRECTIONS.map((p, i) => {
        const color = PARTICLE_COLORS[i % PARTICLE_COLORS.length]
        return (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: dotSize,
              height: dotSize,
              background: color,
              boxShadow: `0 0 ${dotSize}px color-mix(in oklch, ${color} 60%, transparent)`,
            }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
            animate={{
              x: p.x * distance,
              y: p.y * distance,
              opacity: [0, 1, 1, 0],
              scale: [0.4, 1, 0.9, 0.2],
            }}
            transition={{
              duration: 1.1,
              repeat: Infinity,
              delay: i * 0.06,
              ease: 'easeOut',
              times: [0, 0.2, 0.7, 1],
            }}
          />
        )
      })}
    </div>
  )
}

export default LeoPremium

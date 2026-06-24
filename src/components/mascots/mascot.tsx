'use client'

import { usePrefs } from '@/components/theme-provider'
import { cn } from '@/lib/utils'
import type { MascotKey, MascotState } from '@/lib/types'

interface MascotProps {
  mascot: MascotKey
  state?: MascotState
  size?: number
  className?: string
  animated?: boolean
  /** When true (or when pref.compactMascot is on), the mascot renders at ~70% size. */
  compact?: boolean
}

// LEO — main learning companion, a friendly orb/robot
function LeoSvg({ state, size }: { state: MascotState; size: number }) {
  const thinking = state === 'thinking'
  const happy = state === 'correct' || state === 'achievement' || state === 'greeting'
  const sad = state === 'try-again' || state === 'error' || state === 'warning'
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label="LEO mascot">
      <defs>
        <radialGradient id="leo-body" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="60%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#5b21b6" />
        </radialGradient>
        <radialGradient id="leo-glow" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="55" fill="url(#leo-glow)" />
      {/* Body */}
      <ellipse cx="60" cy="64" rx="36" ry="38" fill="url(#leo-body)" />
      {/* Face screen */}
      <rect x="36" y="42" width="48" height="36" rx="14" fill="#1e1b4b" opacity="0.85" />
      {/* Eyes */}
      {thinking ? (
        <>
          <circle cx="50" cy="60" r="4" fill="#c4b5fd" opacity="0.4" />
          <circle cx="70" cy="60" r="4" fill="#c4b5fd" opacity="0.4" />
          <circle cx="50" cy="60" r="2" fill="#ddd6fe" className="mascot-thinking" />
          <circle cx="70" cy="60" r="2" fill="#ddd6fe" className="mascot-thinking" />
        </>
      ) : happy ? (
        <>
          <path d="M 46 58 Q 50 54 54 58" stroke="#ddd6fe" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M 66 58 Q 70 54 74 58" stroke="#ddd6fe" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      ) : sad ? (
        <>
          <circle cx="50" cy="60" r="3" fill="#ddd6fe" />
          <circle cx="70" cy="60" r="3" fill="#ddd6fe" />
          <path d="M 48 70 Q 60 66 72 70" stroke="#ddd6fe" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="50" cy="60" r="4" fill="#ddd6fe" />
          <circle cx="70" cy="60" r="4" fill="#ddd6fe" />
          <circle cx="51" cy="59" r="1.5" fill="#1e1b4b" />
          <circle cx="71" cy="59" r="1.5" fill="#1e1b4b" />
          <path d="M 52 70 Q 60 74 68 70" stroke="#ddd6fe" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      )}
      {/* Antenna */}
      <line x1="60" y1="26" x2="60" y2="16" stroke="#7c3aed" strokeWidth="2" />
      <circle cx="60" cy="14" r="4" fill="#c4b5fd">
        {happy && <animate attributeName="r" values="4;5;4" dur="1s" repeatCount="indefinite" />}
      </circle>
      {/* Side accents */}
      <circle cx="28" cy="64" r="4" fill="#5b21b6" />
      <circle cx="92" cy="64" r="4" fill="#5b21b6" />
    </svg>
  )
}

// Byte — Data Structures, geometric node robot
function ByteSvg({ state, size }: { state: MascotState; size: number }) {
  const happy = state === 'correct' || state === 'achievement'
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label="Byte mascot">
      <defs>
        <linearGradient id="byte-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
      </defs>
      {/* Hexagon body */}
      <polygon points="60,18 96,38 96,82 60,102 24,82 24,38" fill="url(#byte-body)" />
      <polygon points="60,18 96,38 96,82 60,102 24,82 24,38" fill="none" stroke="#155e75" strokeWidth="1.5" />
      {/* Inner face */}
      <polygon points="60,34 84,48 84,72 60,86 36,72 36,48" fill="#0e7490" opacity="0.6" />
      {/* Node eyes */}
      <rect x="42" y="50" width="12" height="12" rx="2" fill="#ecfeff" />
      <rect x="66" y="50" width="12" height="12" rx="2" fill="#ecfeff" />
      <circle cx="48" cy="56" r="3" fill="#0e7490" />
      <circle cx="72" cy="56" r="3" fill="#0e7490" />
      {/* Connection line (linked list reference) */}
      <line x1="54" y1="56" x2="66" y2="56" stroke="#ecfeff" strokeWidth="1.5" strokeDasharray="2 2" />
      {/* Mouth */}
      {happy ? (
        <path d="M 50 72 Q 60 78 70 72" stroke="#ecfeff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      ) : (
        <line x1="52" y1="72" x2="68" y2="72" stroke="#ecfeff" strokeWidth="2.5" strokeLinecap="round" />
      )}
      {/* Pointer arrows */}
      <path d="M 96 60 L 108 60 M 104 56 L 108 60 L 104 64" stroke="#0891b2" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  )
}

// Coda — C++ companion, digital fox
function CodaSvg({ state, size }: { state: MascotState; size: number }) {
  const happy = state === 'correct' || state === 'achievement'
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label="Coda mascot">
      <defs>
        <linearGradient id="coda-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      {/* Ears */}
      <polygon points="34,30 44,16 50,34" fill="#d97706" />
      <polygon points="86,30 76,16 70,34" fill="#d97706" />
      <polygon points="37,28 43,20 46,30" fill="#fef3c7" />
      <polygon points="83,28 77,20 74,30" fill="#fef3c7" />
      {/* Head */}
      <ellipse cx="60" cy="58" rx="32" ry="30" fill="url(#coda-body)" />
      {/* Snout */}
      <ellipse cx="60" cy="72" rx="14" ry="10" fill="#fef3c7" />
      {/* Nose */}
      <ellipse cx="60" cy="68" rx="3" ry="2" fill="#451a03" />
      {/* Eyes */}
      <ellipse cx="50" cy="54" rx="4" ry="5" fill="#451a03" />
      <ellipse cx="70" cy="54" rx="4" ry="5" fill="#451a03" />
      <circle cx="51" cy="53" r="1.5" fill="#fef3c7" />
      <circle cx="71" cy="53" r="1.5" fill="#fef3c7" />
      {/* Terminal icon on chest */}
      <rect x="50" y="82" width="20" height="14" rx="2" fill="#1e1b4b" />
      <text x="53" y="92" fontSize="8" fill="#22d3ee" fontFamily="monospace">{'>_'}</text>
      {/* Happy cheeks */}
      {happy && <circle cx="44" cy="64" r="3" fill="#fca5a5" opacity="0.6" />}
      {happy && <circle cx="76" cy="64" r="3" fill="#fca5a5" opacity="0.6" />}
    </svg>
  )
}

// Pico — Microprocessors, processor chip character
function PicoSvg({ state, size }: { state: MascotState; size: number }) {
  const happy = state === 'correct' || state === 'achievement'
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label="Pico mascot">
      <defs>
        <linearGradient id="pico-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f472b6" />
          <stop offset="100%" stopColor="#be185d" />
        </linearGradient>
      </defs>
      {/* Chip pins */}
      {[28, 40, 52, 64, 76, 88].map((y) => (
        <g key={y}>
          <line x1="20" y1={y} x2="30" y2={y} stroke="#9d174d" strokeWidth="2" />
          <line x1="90" y1={y} x2="100" y2={y} stroke="#9d174d" strokeWidth="2" />
        </g>
      ))}
      {/* Chip body */}
      <rect x="30" y="24" width="60" height="68" rx="6" fill="url(#pico-body)" />
      <rect x="30" y="24" width="60" height="68" rx="6" fill="none" stroke="#831843" strokeWidth="1.5" />
      {/* Notch */}
      <circle cx="38" cy="32" r="2" fill="#831843" />
      {/* Face area */}
      <rect x="40" y="40" width="40" height="36" rx="4" fill="#831843" opacity="0.5" />
      {/* Register eyes */}
      <rect x="46" y="48" width="10" height="8" rx="1" fill="#fce7f3" />
      <rect x="64" y="48" width="10" height="8" rx="1" fill="#fce7f3" />
      <text x="48" y="54" fontSize="5" fill="#be185d" fontFamily="monospace">AX</text>
      <text x="66" y="54" fontSize="5" fill="#be185d" fontFamily="monospace">BX</text>
      {/* Mouth = instruction */}
      <rect x="48" y="64" width="24" height="6" rx="1" fill="#fce7f3" />
      <text x="50" y="69" fontSize="4.5" fill="#be185d" fontFamily="monospace">MOV AL,1</text>
      {/* Instruction arrow */}
      {happy && (
        <path d="M 60 96 L 60 104 M 56 100 L 60 104 L 64 100" stroke="#be185d" strokeWidth="2" fill="none" strokeLinecap="round" />
      )}
    </svg>
  )
}

// Nova — Data Communication, signal-based floating character
function NovaSvg({ state, size }: { state: MascotState; size: number }) {
  const happy = state === 'correct' || state === 'achievement'
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label="Nova mascot">
      <defs>
        <linearGradient id="nova-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      {/* Signal waves behind */}
      <path d="M 8 60 Q 18 48 28 60 T 48 60" stroke="#10b981" strokeWidth="1.5" fill="none" opacity="0.4" />
      <path d="M 72 60 Q 82 48 92 60 T 112 60" stroke="#10b981" strokeWidth="1.5" fill="none" opacity="0.4" />
      {/* Body (signal orb) */}
      <ellipse cx="60" cy="60" rx="30" ry="32" fill="url(#nova-body)" />
      {/* Wave pattern on body */}
      <path d="M 38 52 Q 44 44 50 52 T 62 52 T 74 52 T 82 52" stroke="#d1fae5" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M 38 62 Q 44 54 50 62 T 62 62 T 74 62 T 82 62" stroke="#d1fae5" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7" />
      <path d="M 38 72 Q 44 64 50 72 T 62 72 T 74 72 T 82 72" stroke="#d1fae5" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.4" />
      {/* Eyes on wave */}
      <circle cx="50" cy="58" r="3" fill="#064e3b" />
      <circle cx="70" cy="58" r="3" fill="#064e3b" />
      {/* Packet dots */}
      <circle cx="20" cy="60" r="2.5" fill="#059669" />
      <circle cx="100" cy="60" r="2.5" fill="#059669" />
      {/* Happy signal */}
      {happy && (
        <g>
          <circle cx="92" cy="30" r="3" fill="#34d399">
            <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />
          </circle>
          <circle cx="102" cy="22" r="2" fill="#34d399" opacity="0.6" />
        </g>
      )}
    </svg>
  )
}

const MASCOTS: Record<MascotKey, (p: { state: MascotState; size: number }) => React.ReactElement> = {
  leo: LeoSvg,
  byte: ByteSvg,
  coda: CodaSvg,
  pico: PicoSvg,
  nova: NovaSvg,
}

export function Mascot({ mascot, state = 'idle', size = 80, className, animated = true, compact }: MascotProps) {
  const { pref } = usePrefs()
  const Svg = MASCOTS[mascot]
  // Respect compact pref (user preference) or per-call compact flag.
  const isCompact = compact || pref.compactMascot
  const effectiveSize = isCompact ? Math.round(size * 0.7) : size
  // Float is disabled in low-power mode (audit: "Low-power mode disables Framer Motion").
  const float = animated && !pref.reducedMotion && !pref.lowPower && state !== 'thinking'

  return (
    <div className={cn('inline-flex items-center justify-center', float && 'mascot-float', className)}>
      <Svg state={state} size={effectiveSize} />
    </div>
  )
}

// Mascot with speech bubble
export function MascotWithBubble({
  mascot,
  state = 'explaining',
  message,
  size = 72,
  className,
  onDismiss,
}: {
  mascot: MascotKey
  state?: MascotState
  message: string
  size?: number
  className?: string
  onDismiss?: () => void
}) {
  const { pref } = usePrefs()
  if (!pref.mascotsEnabled) return null
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <Mascot mascot={mascot} state={state} size={size} />
      <div className="relative flex-1 rounded-2xl rounded-tl-none bg-card border border-border p-3 shadow-sm max-w-sm">
        <p className="text-sm leading-relaxed">{message}</p>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute -top-2 -right-2 rounded-full bg-muted hover:bg-muted-foreground/20 w-5 h-5 flex items-center justify-center text-xs"
            aria-label="Dismiss"
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}

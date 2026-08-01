import { useId } from 'react'
import { cn } from '@/lib/utils'

export type LearningIllustrationVariant =
  | 'journey'
  | 'focus'
  | 'practice'
  | 'revision'
  | 'coding'
  | 'planner'
  | 'tutor'
  | 'celebration'
  | 'empty'
  | 'transition'

interface LearningIllustrationProps {
  variant?: LearningIllustrationVariant
  className?: string
  animated?: boolean
  title?: string
}

const LABELS: Record<LearningIllustrationVariant, string> = {
  journey: 'A student learning journey across lessons and goals',
  focus: 'A calm focus timer and study desk',
  practice: 'Practice questions becoming stronger understanding',
  revision: 'Flashcards and memory connections',
  coding: 'Code blocks and a working terminal',
  planner: 'A balanced weekly study plan',
  tutor: 'An AI learning companion explaining a concept',
  celebration: 'A completed learning goal celebration',
  empty: 'A friendly empty study desk ready for new work',
  transition: 'Learning ideas moving between pages',
}

export function LearningIllustration({
  variant = 'journey',
  className,
  animated = true,
  title,
}: LearningIllustrationProps) {
  const rawId = useId().replace(/:/g, '')
  const gradientId = `learning-gradient-${rawId}`
  const glowId = `learning-glow-${rawId}`
  const clipId = `learning-clip-${rawId}`

  return (
    <svg
      viewBox="0 0 420 280"
      className={cn('h-auto w-full overflow-visible', className)}
      role="img"
      aria-label={title ?? LABELS[variant]}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.95" />
          <stop offset="100%" stopColor="hsl(var(--accent-foreground))" stopOpacity="0.7" />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.28" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </radialGradient>
        <clipPath id={clipId}>
          <rect x="42" y="35" width="336" height="210" rx="28" />
        </clipPath>
      </defs>

      <ellipse cx="210" cy="235" rx="158" ry="24" fill={`url(#${glowId})`} />
      <rect x="42" y="35" width="336" height="210" rx="28" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
      <g clipPath={`url(#${clipId})`}>
        <circle cx="76" cy="58" r="90" fill="hsl(var(--primary))" opacity="0.07" />
        <circle cx="360" cy="226" r="105" fill="hsl(var(--primary))" opacity="0.06" />
        <path d="M38 211C111 169 167 238 232 194C294 152 333 169 392 129" fill="none" stroke="hsl(var(--border))" strokeWidth="2" strokeDasharray="6 8" />
      </g>

      {variant === 'journey' && <JourneyScene gradientId={gradientId} animated={animated} />}
      {variant === 'focus' && <FocusScene gradientId={gradientId} animated={animated} />}
      {variant === 'practice' && <PracticeScene gradientId={gradientId} animated={animated} />}
      {variant === 'revision' && <RevisionScene gradientId={gradientId} animated={animated} />}
      {variant === 'coding' && <CodingScene gradientId={gradientId} animated={animated} />}
      {variant === 'planner' && <PlannerScene gradientId={gradientId} animated={animated} />}
      {variant === 'tutor' && <TutorScene gradientId={gradientId} animated={animated} />}
      {variant === 'celebration' && <CelebrationScene gradientId={gradientId} animated={animated} />}
      {variant === 'empty' && <EmptyScene gradientId={gradientId} animated={animated} />}
      {variant === 'transition' && <TransitionScene gradientId={gradientId} animated={animated} />}
    </svg>
  )
}

function MotionGroup({ animated, children, className }: { animated: boolean; children: React.ReactNode; className?: string }) {
  return <g className={cn(animated && 'motion-safe:animate-[learningFloat_4s_ease-in-out_infinite]', className)}>{children}</g>
}

function JourneyScene({ gradientId, animated }: { gradientId: string; animated: boolean }) {
  return (
    <>
      <path d="M86 195C128 170 135 118 180 132C226 146 234 83 286 91C322 96 331 126 347 145" fill="none" stroke={`url(#${gradientId})`} strokeWidth="8" strokeLinecap="round" />
      {[
        [92, 190, '1'], [178, 132, '2'], [286, 91, '3'], [347, 145, '✓'],
      ].map(([x, y, label], index) => (
        <MotionGroup key={String(label)} animated={animated} className={index % 2 ? '[animation-delay:450ms]' : ''}>
          <circle cx={Number(x)} cy={Number(y)} r="23" fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth="4" />
          <text x={Number(x)} y={Number(y) + 5} textAnchor="middle" fontSize="14" fontWeight="800" fill="hsl(var(--foreground))">{label}</text>
        </MotionGroup>
      ))}
      <rect x="126" y="58" width="98" height="42" rx="13" fill="hsl(var(--muted))" />
      <rect x="140" y="71" width="68" height="7" rx="3.5" fill="hsl(var(--primary))" opacity="0.8" />
      <rect x="140" y="84" width="44" height="5" rx="2.5" fill="hsl(var(--muted-foreground))" opacity="0.35" />
    </>
  )
}

function FocusScene({ gradientId, animated }: { gradientId: string; animated: boolean }) {
  return (
    <>
      <rect x="93" y="180" width="236" height="16" rx="8" fill="hsl(var(--muted-foreground))" opacity="0.25" />
      <rect x="126" y="100" width="118" height="78" rx="14" fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="3" />
      <rect x="142" y="116" width="86" height="46" rx="8" fill="hsl(var(--muted))" />
      <path d="M167 178L157 196M203 178L213 196" stroke="hsl(var(--muted-foreground))" strokeWidth="7" strokeLinecap="round" />
      <MotionGroup animated={animated}>
        <circle cx="285" cy="112" r="43" fill="hsl(var(--background))" stroke={`url(#${gradientId})`} strokeWidth="8" />
        <path d="M285 112L285 85M285 112L306 125" stroke="hsl(var(--foreground))" strokeWidth="5" strokeLinecap="round" />
        <circle cx="285" cy="112" r="5" fill="hsl(var(--primary))" />
      </MotionGroup>
      <path d="M89 180C92 154 111 145 132 149" fill="none" stroke="hsl(var(--primary))" strokeWidth="6" strokeLinecap="round" opacity="0.7" />
    </>
  )
}

function PracticeScene({ gradientId, animated }: { gradientId: string; animated: boolean }) {
  return (
    <>
      {[0, 1, 2].map((index) => (
        <g key={index} transform={`translate(${94 + index * 72} ${85 + index * 24}) rotate(${index * 4 - 4})`}>
          <rect width="130" height="70" rx="15" fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="2" />
          <circle cx="22" cy="23" r="9" fill={index === 2 ? `url(#${gradientId})` : 'hsl(var(--muted))'} />
          <rect x="40" y="17" width="68" height="8" rx="4" fill="hsl(var(--muted-foreground))" opacity="0.4" />
          <rect x="20" y="43" width="88" height="7" rx="3.5" fill="hsl(var(--muted))" />
        </g>
      ))}
      <MotionGroup animated={animated}>
        <circle cx="315" cy="188" r="28" fill={`url(#${gradientId})`} />
        <path d="M302 188L311 197L329 178" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      </MotionGroup>
    </>
  )
}

function RevisionScene({ gradientId, animated }: { gradientId: string; animated: boolean }) {
  return (
    <>
      <g transform="translate(92 83) rotate(-7)">
        <rect width="132" height="88" rx="16" fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="3" />
        <text x="20" y="34" fontSize="13" fontWeight="800" fill="hsl(var(--foreground))">What is a stack?</text>
        <rect x="20" y="50" width="79" height="8" rx="4" fill="hsl(var(--muted))" />
      </g>
      <g transform="translate(196 104) rotate(8)">
        <rect width="132" height="88" rx="16" fill={`url(#${gradientId})`} />
        <text x="18" y="34" fontSize="13" fontWeight="800" fill="white">LIFO structure</text>
        <rect x="18" y="51" width="86" height="7" rx="3.5" fill="white" opacity="0.55" />
      </g>
      <MotionGroup animated={animated}>
        <path d="M145 198C179 221 231 222 270 193" fill="none" stroke="hsl(var(--primary))" strokeWidth="5" strokeLinecap="round" />
        <path d="M263 185L275 192L266 204" fill="none" stroke="hsl(var(--primary))" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </MotionGroup>
    </>
  )
}

function CodingScene({ gradientId, animated }: { gradientId: string; animated: boolean }) {
  return (
    <>
      <rect x="81" y="72" width="258" height="140" rx="18" fill="#0b1020" stroke="hsl(var(--border))" strokeWidth="3" />
      <circle cx="105" cy="94" r="5" fill="#fb7185" /><circle cx="123" cy="94" r="5" fill="#fbbf24" /><circle cx="141" cy="94" r="5" fill="#34d399" />
      <path d="M112 130L92 145L112 160M154 120L136 172M176 130L196 145L176 160" fill="none" stroke={`url(#${gradientId})`} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="222" y="126" width="88" height="8" rx="4" fill="#64748b" opacity="0.7" />
      <rect x="222" y="145" width="64" height="8" rx="4" fill="#64748b" opacity="0.45" />
      <MotionGroup animated={animated}>
        <rect x="222" y="174" width="72" height="21" rx="7" fill="hsl(var(--primary))" />
        <text x="258" y="188" textAnchor="middle" fontSize="10" fontWeight="800" fill="white">RUN ✓</text>
      </MotionGroup>
    </>
  )
}

function PlannerScene({ gradientId, animated }: { gradientId: string; animated: boolean }) {
  return (
    <>
      <rect x="88" y="68" width="244" height="150" rx="20" fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="3" />
      <rect x="88" y="68" width="244" height="39" rx="20" fill={`url(#${gradientId})`} />
      <rect x="88" y="88" width="244" height="19" fill={`url(#${gradientId})`} />
      {[0, 1, 2, 3, 4].map((column) => <path key={column} d={`M${112 + column * 47} 113V204`} stroke="hsl(var(--border))" />)}
      {[0, 1, 2].map((row) => <path key={row} d={`M100 ${135 + row * 25}H320`} stroke="hsl(var(--border))" />)}
      <MotionGroup animated={animated}>
        <rect x="124" y="142" width="75" height="18" rx="7" fill="hsl(var(--primary))" opacity="0.8" />
        <rect x="215" y="168" width="69" height="18" rx="7" fill="hsl(var(--primary))" opacity="0.45" />
      </MotionGroup>
    </>
  )
}

function TutorScene({ gradientId, animated }: { gradientId: string; animated: boolean }) {
  return (
    <>
      <MotionGroup animated={animated}>
        <circle cx="157" cy="143" r="58" fill={`url(#${gradientId})`} />
        <circle cx="139" cy="137" r="7" fill="white" /><circle cx="175" cy="137" r="7" fill="white" />
        <path d="M137 164C148 176 167 176 178 164" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" />
        <path d="M157 76V58M108 91L95 78M206 91L219 78" stroke="hsl(var(--primary))" strokeWidth="6" strokeLinecap="round" />
      </MotionGroup>
      <path d="M226 92H313C325 92 335 102 335 114V162C335 174 325 184 313 184H268L245 204V184H226C214 184 204 174 204 162V114C204 102 214 92 226 92Z" fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="3" />
      <rect x="226" y="116" width="82" height="8" rx="4" fill="hsl(var(--primary))" opacity="0.7" />
      <rect x="226" y="136" width="65" height="7" rx="3.5" fill="hsl(var(--muted))" />
      <rect x="226" y="154" width="74" height="7" rx="3.5" fill="hsl(var(--muted))" />
    </>
  )
}

function CelebrationScene({ gradientId, animated }: { gradientId: string; animated: boolean }) {
  return (
    <>
      <MotionGroup animated={animated}>
        <circle cx="210" cy="139" r="66" fill={`url(#${gradientId})`} />
        <path d="M177 139L199 161L245 113" fill="none" stroke="white" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
      </MotionGroup>
      {[
        [91, 89, 10], [117, 187, 8], [303, 78, 8], [329, 182, 11], [210, 56, 7],
      ].map(([x, y, size], index) => <circle key={index} cx={x} cy={y} r={size} fill={index % 2 ? 'hsl(var(--primary))' : 'hsl(var(--accent-foreground))'} opacity="0.7" />)}
      <path d="M102 130L77 118M314 136L344 123M145 70L132 45M273 67L287 43" stroke="hsl(var(--primary))" strokeWidth="5" strokeLinecap="round" />
    </>
  )
}

function EmptyScene({ gradientId, animated }: { gradientId: string; animated: boolean }) {
  return (
    <>
      <rect x="103" y="173" width="214" height="14" rx="7" fill="hsl(var(--muted-foreground))" opacity="0.22" />
      <g transform="translate(124 96)">
        <path d="M0 17C26 2 52 2 78 17V78C53 64 27 64 0 78Z" fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="3" />
        <path d="M156 17C130 2 104 2 78 17V78C103 64 129 64 156 78Z" fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="3" />
        <path d="M78 17V78" stroke="hsl(var(--border))" strokeWidth="3" />
      </g>
      <MotionGroup animated={animated}>
        <circle cx="303" cy="104" r="27" fill={`url(#${gradientId})`} />
        <path d="M303 91V117M290 104H316" stroke="white" strokeWidth="6" strokeLinecap="round" />
      </MotionGroup>
    </>
  )
}

function TransitionScene({ gradientId, animated }: { gradientId: string; animated: boolean }) {
  return (
    <>
      {[0, 1, 2].map((index) => (
        <MotionGroup key={index} animated={animated} className={`[animation-delay:${index * 180}ms]`}>
          <rect x={91 + index * 83} y={91 + (index % 2) * 38} width="72" height="72" rx="18" fill={index === 1 ? `url(#${gradientId})` : 'hsl(var(--background))'} stroke="hsl(var(--border))" strokeWidth="3" />
          <circle cx={127 + index * 83} cy={127 + (index % 2) * 38} r="13" fill={index === 1 ? 'white' : 'hsl(var(--primary))'} opacity="0.85" />
        </MotionGroup>
      ))}
      <path d="M165 127H190M247 165H272" stroke="hsl(var(--primary))" strokeWidth="6" strokeLinecap="round" strokeDasharray="8 9" />
    </>
  )
}

'use client'

/**
 * FlashcardPlayer — premium SM-2 flashcard study component.
 *
 * Renders an Anki-style 3D flip-card study flow driven by the user's
 * `RevisionSchedule` data. Designed as a drop-in for the Smart Revision
 * view (and optionally the Dashboard).
 *
 * Flow:
 *   1. Pre-study header — shows how many cards are due + a "Start Session" button.
 *   2. Study state — one card at a time, click to flip (3D rotateY), then self-rate
 *      with 4 quality buttons (Again / Hard / Good / Easy) wired to the SM-2 POST.
 *      Progress bar at top. Keyboard shortcuts (Space / 1-4) for power users.
 *   3. End-of-session summary — celebratory screen with XP earned, mastery
 *      breakdown, achievements unlocked badge, and "Back to Revision" button.
 *
 * Visual polish:
 *   - 4px left-side gradient accent bar using the subject's accent color.
 *   - Difficulty pill (easy=emerald / medium=amber / hard=rose).
 *   - Days-overdue badge (overdue=rose / due today=primary).
 *   - Framer Motion slide-in (right) on card enter, slide-out (left) on rating.
 *   - Subtle ±3° cursor parallax tilt (desktop only, disabled in low-power / reduced-motion).
 *   - Skeleton shimmer loading state + friendly mascot empty state + retryable error state.
 *
 * Self-contained: owns its own data fetching, keyboard handling, and session
 * state. Only side-effect on the parent is an optional `onExit` callback fired
 * from the "Back to Revision" button.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { toast } from 'sonner'
import {
  RotateCcw,
  Check,
  ChevronsRight,
  Sparkles,
  Brain,
  Clock,
  Layers,
  Keyboard,
  PartyPopper,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { Mascot } from '@/components/mascots/mascot'
import { usePrefs } from '@/components/theme-provider'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type FlashcardQuality = 0 | 1 | 2 | 3 | 4 | 5
type Difficulty = 'easy' | 'medium' | 'hard'

interface FlashcardDTO {
  scheduleId: string
  topicId: string
  subjectId: string | null
  subjectName: string
  subjectCode: string
  subjectAccent: string
  topicTitle: string
  topicSlug: string
  topicDifficulty: Difficulty
  front: string
  back: string
  dueAt: string
  daysOverdue: number
  easeFactor: number
  intervalDays: number
  state: string
  attemptCount: number
}

interface UnlockedAchievement {
  id: string
  key: string
  name: string
  description: string
  icon: string
  category: string
  xpReward: number
  earnedAt: string
}

interface FlashcardsData {
  cards: FlashcardDTO[]
  totalDue: number
}

interface RateResponse {
  recorded: boolean
  newIntervalDays: number
  newEaseFactor: number
  newState: string
  nextDueDate: string
  xpAwarded: number
  totalXp: number
  newlyUnlocked: UnlockedAchievement[]
}

export interface FlashcardPlayerProps {
  /** Optional subject filter — when omitted, fetches all due cards. */
  subjectId?: string
  /** Optional callback fired when the user clicks "Back to Revision". */
  onExit?: () => void
  className?: string
}

/* ------------------------------------------------------------------ */
/* Style helpers                                                       */
/* ------------------------------------------------------------------ */

const DIFFICULTY_STYLES: Record<Difficulty, { label: string; className: string; dot: string }> = {
  easy: { label: 'Easy', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', dot: 'bg-emerald-500' },
  medium: { label: 'Medium', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20', dot: 'bg-amber-500' },
  hard: { label: 'Hard', className: 'bg-rose-500/10 text-rose-600 border-rose-500/20', dot: 'bg-rose-500' },
}

const STATE_LABELS: Record<string, string> = {
  new: 'New',
  learning: 'Learning',
  weak: 'Weak',
  revising: 'Revising',
  proficient: 'Proficient',
  mastered: 'Mastered',
}

const STATE_COLORS: Record<string, string> = {
  new: 'bg-muted text-muted-foreground',
  learning: 'bg-violet-500/10 text-violet-600',
  weak: 'bg-rose-500/10 text-rose-600',
  revising: 'bg-amber-500/10 text-amber-600',
  proficient: 'bg-emerald-500/10 text-emerald-600',
  mastered: 'bg-green-500/10 text-green-600',
}

/**
 * Predict the next review interval (in days) for a given quality rating,
 * mirroring the SM-2 logic in the API POST handler. Used only for tooltip
 * hints — the server is the source of truth.
 */
function predictNextInterval(card: FlashcardDTO, q: FlashcardQuality): number {
  if (q < 3) return 1
  const oldInterval = card.intervalDays
  const oldEase = card.easeFactor
  if (oldInterval <= 1) return q >= 4 ? 3 : 2
  return Math.max(1, Math.round(oldInterval * oldEase))
}

function formatInterval(days: number): string {
  if (days === 1) return '1 day'
  if (days < 30) return `${days} days`
  if (days < 365) return `${Math.round(days / 7)} weeks`
  return `${Math.round(days / 30)} months`
}

/* ------------------------------------------------------------------ */
/* Sub-states                                                          */
/* ------------------------------------------------------------------ */

type Phase = 'idle' | 'studying' | 'summary'
type Direction = 1 | -1

interface SessionStats {
  cardsStudied: number
  totalXpEarned: number
  stateBreakdown: Map<string, number>
  achievementsUnlocked: UnlockedAchievement[]
}

/* ------------------------------------------------------------------ */
/* Skeleton + Empty + Error states                                     */
/* ------------------------------------------------------------------ */

function SkeletonCard() {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1 skeleton-premium" />
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-5 w-20 rounded skeleton-premium" />
          <div className="h-5 w-16 rounded skeleton-premium" />
        </div>
        <div className="h-7 w-3/4 rounded skeleton-premium mb-3" />
        <div className="h-5 w-1/2 rounded skeleton-premium mb-8" />
        <div className="h-32 w-full rounded-xl skeleton-premium mb-4" />
        <div className="flex gap-2">
          <div className="h-9 flex-1 rounded-md skeleton-premium" />
          <div className="h-9 flex-1 rounded-md skeleton-premium" />
          <div className="h-9 flex-1 rounded-md skeleton-premium" />
          <div className="h-9 flex-1 rounded-md skeleton-premium" />
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
        <Mascot mascot="leo" state="greeting" size={84} />
        <div className="space-y-1.5 max-w-sm">
          <p className="text-base font-semibold text-foreground">No cards due right now!</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Come back later or complete more lessons to add topics to your revision schedule.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function ErrorState({ onRetry, refreshing }: { onRetry: () => void; refreshing: boolean }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <AlertCircle className="h-8 w-8 text-muted-foreground/60" />
        <p className="text-sm text-muted-foreground">Couldn&apos;t load flashcards.</p>
        <Button size="sm" variant="outline" onClick={onRetry} disabled={refreshing}>
          <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
          Tap to retry
        </Button>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Pre-study header                                                    */
/* ------------------------------------------------------------------ */

function PreStudyHeader({
  totalDue,
  subjectName,
  onStart,
  reduced,
}: {
  totalDue: number
  subjectName: string | null
  onStart: () => void
  reduced: boolean
}) {
  return (
    <Card className="relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at top right, var(--primary), transparent 60%)',
        }}
      />
      <CardContent className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-2">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-semibold leading-tight">Smart Revision · Flashcards</h3>
              {subjectName && (
                <Badge variant="secondary" className="text-meta py-0">
                  {subjectName}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {totalDue === 0 ? (
                'No cards due — nice work!'
              ) : (
                <>
                  <span className="font-semibold text-foreground">{totalDue}</span>{' '}
                  {totalDue === 1 ? 'card' : 'cards'} ready for review
                </>
              )}
            </p>
          </div>
        </div>
        <Button
          size="lg"
          onClick={onStart}
          disabled={totalDue === 0}
          className={cn(!reduced && 'card-lift')}
        >
          <Sparkles className="h-4 w-4" />
          Start Session
        </Button>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* 3D Flip Card                                                        */
/* ------------------------------------------------------------------ */

interface FlipCardProps {
  card: FlashcardDTO
  flipped: boolean
  reduced: boolean
  tiltEnabled: boolean
  onFlip: () => void
}

function FlipCard({ card, flipped, reduced, tiltEnabled, onFlip }: FlipCardProps) {
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 })
  const accent = card.subjectAccent || '#7c3aed'
  const diffStyle = DIFFICULTY_STYLES[card.topicDifficulty] ?? DIFFICULTY_STYLES.medium

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!tiltEnabled) return
      const rect = e.currentTarget.getBoundingClientRect()
      const px = (e.clientX - rect.left) / rect.width // 0..1
      const py = (e.clientY - rect.top) / rect.height // 0..1
      // ±3deg
      setTilt({
        ry: (px - 0.5) * 6,
        rx: -(py - 0.5) * 6,
      })
    },
    [tiltEnabled],
  )

  const resetTilt = useCallback(() => setTilt({ rx: 0, ry: 0 }), [])

  // Reduced motion: render only the active face as a plain swap.
  if (reduced) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onFlip}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onFlip()
        }}
        aria-label={flipped ? 'Showing answer. Click to hide.' : 'Showing question. Click to reveal answer.'}
        className="relative cursor-pointer select-none"
      >
        <CardFace
          card={card}
          side={flipped ? 'back' : 'front'}
          accent={accent}
          diffStyle={diffStyle}
        />
      </div>
    )
  }

  // Full 3D flip with optional cursor parallax tilt.
  return (
    <div
      className="relative cursor-pointer select-none"
      style={{ perspective: '1000px' }}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
      onPointerCancel={resetTilt}
      onClick={onFlip}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onFlip()
      }}
      aria-label={flipped ? 'Showing answer. Click to hide.' : 'Showing question. Click to reveal answer.'}
    >
      {/* Tilt + flip wrapper. Tilt is applied to an outer preserve-3d layer so
          the flip's rotateY composes correctly with the parallax rotation. */}
      <div
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
          transition: 'transform 0.18s ease-out',
        }}
      >
        <div
          style={{
            transformStyle: 'preserve-3d',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {/* Front face */}
          <div
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
          >
            <CardFace card={card} side="front" accent={accent} diffStyle={diffStyle} />
          </div>
          {/* Back face — pre-rotated 180° so it's hidden until the flip */}
          <div
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              position: 'absolute',
              inset: 0,
            }}
          >
            <CardFace card={card} side="back" accent={accent} diffStyle={diffStyle} />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Card face — front or back                                           */
/* ------------------------------------------------------------------ */

function CardFace({
  card,
  side,
  accent,
  diffStyle,
}: {
  card: FlashcardDTO
  side: 'front' | 'back'
  accent: string
  diffStyle: { label: string; className: string; dot: string }
}) {
  const overdue = card.daysOverdue > 0
  const stateLabel = STATE_LABELS[card.state] ?? card.state
  const stateColor = STATE_COLORS[card.state] ?? 'bg-muted text-muted-foreground'

  return (
    <Card
      className={cn(
        'relative overflow-hidden min-h-[320px] sm:min-h-[360px] flex flex-col',
        side === 'back' && 'bg-card',
      )}
    >
      {/* 4px left-side gradient accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{
          background: `linear-gradient(to bottom, ${accent}, ${accent}40)`,
        }}
        aria-hidden
      />

      <CardContent className="flex-1 flex flex-col pt-6 pl-7">
        {/* Header row: subject + difficulty + overdue badge */}
        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: accent }}
              aria-hidden
            />
            <span className="text-xs font-medium text-muted-foreground truncate">
              {card.subjectName}
              {card.subjectCode ? ` · ${card.subjectCode}` : ''}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className={cn('gap-1', diffStyle.className)}>
              <span className={cn('h-1.5 w-1.5 rounded-full', diffStyle.dot)} aria-hidden />
              {diffStyle.label}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                'gap-1',
                overdue
                  ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                  : 'bg-primary/10 text-primary border-primary/20',
              )}
            >
              <Clock className="h-3 w-3" />
              {overdue ? `${card.daysOverdue}d overdue` : 'Due today'}
            </Badge>
          </div>
        </div>

        {side === 'front' ? (
          <>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Layers className="h-3.5 w-3.5" />
              <span className="uppercase tracking-wide">Topic</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold leading-tight text-foreground mb-2">
              {card.front}
            </h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className={cn('text-meta', stateColor)}>
                {stateLabel}
              </Badge>
              <span className="text-muted-foreground/70">
                {card.attemptCount === 0
                  ? 'First review'
                  : `${card.attemptCount} prior ${card.attemptCount === 1 ? 'review' : 'reviews'}`}
              </span>
            </div>

            {/* Spacer pushing the hint to the bottom */}
            <div className="flex-1" />

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/80 pt-6 pb-1">
              <Keyboard className="h-3.5 w-3.5" />
              <span>Tap to reveal</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Brain className="h-3.5 w-3.5" />
              <span className="uppercase tracking-wide">Revise</span>
            </div>
            <div className="text-base sm:text-lg font-semibold text-foreground mb-2 leading-snug">
              {card.front}
            </div>
            <div className="flex-1 overflow-y-auto max-h-[200px] pr-1 -mr-1">
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                {card.back}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/80 pt-4 pb-1">
              <span>Rate your recall below</span>
              <ChevronsRight className="h-3.5 w-3.5" />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Self-rating row                                                     */
/* ------------------------------------------------------------------ */

interface RatingOption {
  label: string
  quality: FlashcardQuality
  variant: 'default' | 'outline' | 'destructive' | 'secondary' | 'ghost' | 'link'
  className: string
  key: string
}

const RATING_OPTIONS: RatingOption[] = [
  {
    label: 'Again',
    quality: 0,
    variant: 'outline',
    className: 'border-rose-500/40 text-rose-600 hover:bg-rose-500/10 hover:text-rose-700',
    key: '1',
  },
  {
    label: 'Hard',
    quality: 2,
    variant: 'outline',
    className: 'border-amber-500/40 text-amber-600 hover:bg-amber-500/10 hover:text-amber-700',
    key: '2',
  },
  {
    label: 'Good',
    quality: 3,
    variant: 'default',
    className: 'bg-primary text-primary-foreground hover:bg-primary/90',
    key: '3',
  },
  {
    label: 'Easy',
    quality: 5,
    variant: 'outline',
    className: 'border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700',
    key: '4',
  },
]

function RatingRow({
  card,
  disabled,
  onRate,
}: {
  card: FlashcardDTO
  disabled: boolean
  onRate: (q: FlashcardQuality) => void
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {RATING_OPTIONS.map((opt) => {
        const nextDays = predictNextInterval(card, opt.quality)
        const nextLabel = formatInterval(nextDays)
        return (
          <Tooltip key={opt.label}>
            <TooltipTrigger asChild>
              <Button
                variant={opt.variant}
                size="default"
                disabled={disabled}
                onClick={() => onRate(opt.quality)}
                className={cn('relative h-11 font-semibold', opt.className)}
                aria-label={`${opt.label} — next review in ${nextLabel}`}
              >
                <span className="absolute top-1 left-1.5 text-meta font-mono opacity-50">
                  {opt.key}
                </span>
                {opt.label}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <span className="font-semibold">{opt.label}</span>
              <span className="opacity-70"> · next: {nextLabel}</span>
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* End-of-session summary                                              */
/* ------------------------------------------------------------------ */

function SessionSummary({
  stats,
  onExit,
  onRestart,
  reduced,
}: {
  stats: SessionStats
  onExit: () => void
  onRestart: () => void
  reduced: boolean
}) {
  const breakdown = Array.from(stats.stateBreakdown.entries())
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at top, oklch(0.72 0.17 75), transparent 55%), radial-gradient(circle at bottom right, oklch(0.65 0.22 340), transparent 60%)',
          }}
        />
        <CardContent className="relative pt-6 flex flex-col items-center text-center gap-5">
          <motion.div
            initial={reduced ? false : { scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.1 }}
            className="h-16 w-16 rounded-full bg-amber-500/10 flex items-center justify-center"
          >
            <PartyPopper className="h-8 w-8 text-amber-500" />
          </motion.div>

          <div className="space-y-1.5">
            <h3 className="text-2xl font-bold text-gradient-warm">Session complete!</h3>
            <p className="text-sm text-muted-foreground">
              You reviewed{' '}
              <span className="font-semibold text-foreground">{stats.cardsStudied}</span>{' '}
              {stats.cardsStudied === 1 ? 'card' : 'cards'}.
            </p>
          </div>

          {/* XP earned */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">
              +{stats.totalXpEarned} XP earned
            </span>
          </div>

          {/* Achievements unlocked badge (inline — global toaster handles the per-event toast) */}
          {stats.achievementsUnlocked.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
              <span className="text-sm font-medium text-amber-600">
                🎉 {stats.achievementsUnlocked.length}{' '}
                {stats.achievementsUnlocked.length === 1 ? 'achievement' : 'achievements'} unlocked
              </span>
            </div>
          )}

          {/* Mastery state breakdown */}
          {breakdown.length > 0 && (
            <div className="w-full space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground text-left">
                Mastery breakdown
              </p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {breakdown.map(([state, count]) => (
                  <Badge
                    key={state}
                    variant="outline"
                    className={cn('text-xs', STATE_COLORS[state] ?? '')}
                  >
                    {count} → {STATE_LABELS[state] ?? state}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto pt-2">
            <Button variant="outline" onClick={onRestart} className="w-full sm:w-auto">
              <RotateCcw className="h-4 w-4" />
              Review Again
            </Button>
            <Button onClick={onExit} className="w-full sm:w-auto">
              <Check className="h-4 w-4" />
              Back to Revision
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export function FlashcardPlayer({ subjectId, onExit, className }: FlashcardPlayerProps) {
  const prefersReduced = useReducedMotion()
  const reduced = prefersReduced === true
  const { pref } = usePrefs()
  // Low-power pref disables parallax (motion slides still allowed unless reduced).
  const tiltEnabled = !reduced && !pref.lowPower

  const [data, setData] = useState<FlashcardsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [errored, setErrored] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const [phase, setPhase] = useState<Phase>('idle')
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [direction, setDirection] = useState<Direction>(1)
  const [submitting, setSubmitting] = useState(false)

  // Session stats — accumulated across the session.
  const statsRef = useRef<SessionStats>({
    cardsStudied: 0,
    totalXpEarned: 0,
    stateBreakdown: new Map<string, number>(),
    achievementsUnlocked: [],
  })
  // Dummy state to force re-render after mutating statsRef.
  const [, setStatsVersion] = useState(0)

  const load = useCallback(async () => {
    setRefreshing(true)
    setErrored(false)
    try {
      const url = new URL('/api/revision/flashcards', window.location.origin)
      if (subjectId) url.searchParams.set('subjectId', subjectId)
      url.searchParams.set('limit', '20')
      const res = await fetch(url.toString(), { cache: 'no-store' })
      const json = (await res.json()) as { ok: boolean; data?: FlashcardsData }
      if (json.ok && json.data) {
        setData(json.data)
      } else {
        setErrored(true)
      }
    } catch {
      setErrored(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [subjectId])

  useEffect(() => {
    load()
  }, [load])

  // Reset session stats whenever a new session starts.
  const startSession = useCallback(() => {
    if (!data || data.cards.length === 0) return
    statsRef.current = {
      cardsStudied: 0,
      totalXpEarned: 0,
      stateBreakdown: new Map<string, number>(),
      achievementsUnlocked: [],
    }
    setIndex(0)
    setFlipped(false)
    setDirection(1)
    setPhase('studying')
  }, [data])

  const exitSession = useCallback(() => {
    setPhase('idle')
    setFlipped(false)
    setIndex(0)
    if (onExit) onExit()
    // Reload the due list (cards just reviewed should no longer be due).
    load()
  }, [onExit, load])

  const flip = useCallback(() => {
    if (submitting) return
    setFlipped((v) => !v)
  }, [submitting])

  const rate = useCallback(
    async (q: FlashcardQuality) => {
      if (!data || submitting) return
      const card = data.cards[index]
      if (!card) return

      setSubmitting(true)
      try {
        const res = await fetch('/api/revision/flashcards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scheduleId: card.scheduleId, quality: q }),
        })
        const json = (await res.json()) as { ok: boolean; data?: RateResponse }
        if (!res.ok || !json.ok || !json.data) {
          throw new Error('Rate request failed')
        }

        // Accumulate session stats.
        const stats = statsRef.current
        stats.cardsStudied += 1
        stats.totalXpEarned += json.data.xpAwarded ?? 0
        const newState = json.data.newState ?? 'revising'
        stats.stateBreakdown.set(newState, (stats.stateBreakdown.get(newState) ?? 0) + 1)
        if (json.data.newlyUnlocked && json.data.newlyUnlocked.length > 0) {
          stats.achievementsUnlocked.push(...json.data.newlyUnlocked)
        }
        setStatsVersion((v) => v + 1)

        toast.success('Card reviewed', {
          description: `+${json.data.xpAwarded ?? 0} XP`,
        })

        // Advance or finish.
        if (index + 1 >= data.cards.length) {
          setPhase('summary')
        } else {
          // Slide current card out to the left, then bring the next in from the right.
          setDirection(1)
          setFlipped(false)
          setIndex((i) => i + 1)
        }
      } catch {
        toast.error('Could not save your rating', {
          description: 'Please try again — your progress was not recorded.',
        })
        // Do NOT advance. User can retry the rating.
      } finally {
        setSubmitting(false)
      }
    },
    [data, index, submitting],
  )

  /* ----------------------------- Keyboard shortcuts ----------------------------- */
  useEffect(() => {
    if (phase !== 'studying') return
    const handler = (e: KeyboardEvent) => {
      // Ignore when focus is inside an input/textarea.
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return
      }
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        flip()
        return
      }
      if (flipped) {
        if (e.key === '1') { e.preventDefault(); void rate(0); return }
        if (e.key === '2') { e.preventDefault(); void rate(2); return }
        if (e.key === '3') { e.preventDefault(); void rate(3); return }
        if (e.key === '4') { e.preventDefault(); void rate(5); return }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [phase, flipped, flip, rate])

  /* ----------------------------- Render ----------------------------- */

  const cards = data?.cards ?? []
  const totalCards = cards.length
  const currentCard = cards[index]
  const progressPct = totalCards > 0 ? Math.round((index / totalCards) * 100) : 0

  const wrapperClass = cn('w-full max-w-2xl mx-auto', className)

  // ---- Loading ----
  if (loading) {
    return (
      <div className={wrapperClass}>
        <SkeletonCard />
      </div>
    )
  }

  // ---- Error ----
  if (errored) {
    return (
      <div className={wrapperClass}>
        <ErrorState onRetry={load} refreshing={refreshing} />
      </div>
    )
  }

  // ---- Empty ----
  if (!data || cards.length === 0 || phase === 'idle') {
    if (phase === 'idle' && cards.length > 0) {
      return (
        <div className={wrapperClass}>
          <PreStudyHeader
            totalDue={totalCards}
            subjectName={cards[0]?.subjectName ?? null}
            onStart={startSession}
            reduced={reduced}
          />
        </div>
      )
    }
    return (
      <div className={wrapperClass}>
        <EmptyState />
      </div>
    )
  }

  // ---- Summary ----
  if (phase === 'summary') {
    return (
      <div className={wrapperClass}>
        <SessionSummary
          stats={statsRef.current}
          onExit={exitSession}
          onRestart={startSession}
          reduced={reduced}
        />
      </div>
    )
  }

  // ---- Studying ----
  return (
    <div className={wrapperClass}>
      {/* Progress bar at top */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium">
            Card <span className="text-foreground">{index + 1}</span> of {totalCards}
          </span>
          <span>{progressPct}% complete</span>
        </div>
        <Progress value={progressPct} className="h-1.5" />
      </div>

      {/* Card stage — AnimatePresence handles the slide in/out transitions */}
      <div className="relative" style={{ minHeight: 360 }}>
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={currentCard?.scheduleId ?? index}
            initial={reduced ? false : { x: 60 * direction, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { x: -60 * direction, opacity: 0 }}
            transition={
              reduced
                ? { duration: 0.15 }
                : { type: 'spring', stiffness: 260, damping: 26 }
            }
          >
            {currentCard && (
              <FlipCard
                card={currentCard}
                flipped={flipped}
                reduced={reduced}
                tiltEnabled={tiltEnabled}
                onFlip={flip}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Self-rating row — appears only after the card is flipped */}
      <div
        className={cn(
          'transition-all duration-300 mt-4',
          flipped ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none h-0 mt-0 overflow-hidden',
        )}
      >
        {currentCard && (
          <RatingRow card={currentCard} disabled={submitting} onRate={rate} />
        )}
      </div>

      {/* Footer hints */}
      <div className="flex items-center justify-between mt-4 text-[11px] text-muted-foreground/70">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted/50 font-mono text-[11px]">Space</kbd>
            flip
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted/50 font-mono text-[11px]">1-4</kbd>
            rate
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={exitSession} className="h-7 text-xs">
          Exit
        </Button>
      </div>
    </div>
  )
}

export default FlashcardPlayer

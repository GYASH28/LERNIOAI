'use client'

/**
 * ExamReadinessWidget
 * -------------------
 * Premium AI-predicted exam readiness widget.
 *
 * Lets the user pick a subject from a horizontal pill row, then POSTs to
 * /api/analytics/readiness with `{ subjectId }`. The endpoint aggregates the
 * user's real activity (lessons, questions, quizzes, focus, mastery) and asks
 * the LEO LLM for a readiness score (0-100) plus strengths, weaknesses, and
 * recommended next steps. The endpoint always falls back to a deterministic
 * heuristic score when the LLM is unavailable, and surfaces a `usedFallback`
 * flag so we can show an "AI unavailable" chip.
 *
 * Subject list is fetched once on mount from GET /api/academics/subjects
 * (spec'd response shape `{ subjects: [...] }`). If that 404s we fall back to
 * GET /api/academics which already exists in the project and returns a bare
 * array (wrapped in the standard `{ ok, data }` envelope). Both shapes are
 * tolerated. If neither resolves we render a "no subjects available" message.
 *
 * UX highlights:
 *   - Big SVG gauge with Framer Motion stroke-dashoffset spring fill (1.2s)
 *   - Count-up score animation (800ms, easeOutCubic, rAF-driven)
 *   - Staggered list entrance for strengths / weaknesses / recommendations
 *     (50ms per item)
 *   - Gauge colour shifts with the score:
 *       0–30  → rose     (needs work)
 *       31–60 → amber    (getting there)
 *       61–85 → emerald  (well prepared)
 *       86–100→ primary  (exam ready)
 *   - "Days to exam" badge when the user has set a date
 *   - Collapsible "Inputs analyzed by AI" disclosure showing the raw signals
 *     in a tidy 2-column key/value grid
 *   - Disclaimer line "AI estimate by LEO · {timestamp}" with a faded variant
 *     + "AI unavailable" warning chip when `usedFallback` is true
 *   - Skeleton gauge + skeleton lines while loading (`.skeleton-premium`)
 *   - Retry state on error
 *   - Honours `prefers-reduced-motion` + the user's reducedMotion/lowPower
 *     prefs (via usePrefs): gauge, count-up and stagger animations all collapse
 *     to instant final values.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Clock,
  Calendar,
  Target,
  ChevronDown,
  Loader2,
  TrendingUp,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { usePrefs } from '@/components/theme-provider'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types — mirror the API response shape from /api/analytics/readiness
// ---------------------------------------------------------------------------

interface Subject {
  id: string
  name: string
  code: string
  accentColor?: string | null
}

type Priority = 'high' | 'medium' | 'low'

interface Recommendation {
  action: string
  reason: string
  priority: Priority
}

interface ReadinessInputs {
  lessonsCompleted: number
  lessonsAvailable: number
  questionsAttempted: number
  questionsCorrect: number
  accuracy: number
  quizzesTaken: number
  avgQuizScore: number
  focusMinutes: number
  revisionCount: number
  masteredTopics: number
  weakTopics: number
  daysToExam: number | null
}

interface ReadinessResult {
  subjectId: string
  subjectName: string
  readinessScore: number
  strengths: string[]
  weaknesses: string[]
  recommendations: Recommendation[]
  inputs: ReadinessInputs
  usedFallback: boolean
  generatedAt: string
}

interface Props {
  className?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resolve gauge colour class + friendly label for a given 0-100 score. */
function gaugeMeta(score: number): { colorClass: string; label: string } {
  if (score <= 30) return { colorClass: 'text-rose-500', label: 'Needs work' }
  if (score <= 60) return { colorClass: 'text-amber-500', label: 'Getting there' }
  if (score <= 85) return { colorClass: 'text-emerald-500', label: 'Well prepared' }
  return { colorClass: 'text-primary', label: 'Exam ready' }
}

/** Resolve priority pill styling for a recommendation. */
function priorityMeta(p: Priority): { className: string; label: string } {
  switch (p) {
    case 'high':
      return {
        className: 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30',
        label: 'High',
      }
    case 'medium':
      return {
        className: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30',
        label: 'Medium',
      }
    default:
      return {
        className: 'bg-muted text-muted-foreground border-border',
        label: 'Low',
      }
  }
}

/** "5m ago" style formatter for an ISO timestamp. */
function timeAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime()
    if (!Number.isFinite(diff)) return ''
    if (diff < 60_000) return 'just now'
    const mins = Math.floor(diff / 60_000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  } catch {
    return ''
  }
}

/**
 * Tolerant subject-list parser. Accepts any of:
 *   - { ok, data: Subject[] }            (okResponse envelope, bare array)
 *   - { ok, data: { subjects: Subject[] } } (okResponse envelope, wrapped)
 *   - { subjects: Subject[] }            (spec'd bare shape)
 *   - Subject[]                          (bare array)
 */
function asSubjects(json: unknown): Subject[] | null {
  if (Array.isArray(json)) return json as Subject[]
  if (!json || typeof json !== 'object') return null
  const obj = json as { data?: unknown; subjects?: unknown }
  // Unwrap { ok, data } envelope first.
  const inner = obj.data ?? obj
  if (Array.isArray(inner)) return inner as Subject[]
  if (inner && typeof inner === 'object') {
    const innerObj = inner as { subjects?: unknown; data?: unknown }
    if (Array.isArray(innerObj.subjects)) return innerObj.subjects as Subject[]
    if (Array.isArray(innerObj.data)) return innerObj.data as Subject[]
  }
  if (Array.isArray(obj.subjects)) return obj.subjects as Subject[]
  return null
}

/**
 * Count-up hook — animates 0 → target over `duration` ms with easeOutCubic.
 * When `enabled` is false (reduced motion / low power), snaps straight to
 * target with no rAF loop.
 */
function useCountUp(target: number, duration: number, enabled: boolean): number {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    // When motion is disabled we skip the rAF loop entirely — the caller
    // returns `target` directly below, so we never call setState here and
    // avoid the cascading-render warning.
    if (!enabled) return
    const start = performance.now()
    const from = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3) // easeOutCubic
      setValue(Math.round(from + (target - from) * eased))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [target, duration, enabled])

  // Snap to target without touching state when motion is disabled.
  return enabled ? value : target
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GAUGE_SIZE = 168
const GAUGE_STROKE = 14
const GAUGE_R = (GAUGE_SIZE - GAUGE_STROKE) / 2
const GAUGE_C = 2 * Math.PI * GAUGE_R

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExamReadinessWidget({ className }: Props) {
  const { pref } = usePrefs()
  const animateMotion = !pref.reducedMotion && !pref.lowPower

  // --- Subject list state (fetched once, persistent across re-renders) ---
  const [subjects, setSubjects] = useState<Subject[] | null>(null)
  const [subjectsError, setSubjectsError] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // --- Readiness state ---
  const [data, setData] = useState<ReadinessResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // -----------------------------------------------------------------------
  // Subject fetch — runs once on mount. Persistent: doesn't reload on every
  // readiness fetch. Falls back to /api/academics if the spec'd endpoint 404s.
  // -----------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        let res = await fetch('/api/academics/subjects', { cache: 'no-store' })
        let arr: Subject[] | null = null
        if (res.ok) {
          arr = asSubjects(await res.json())
        } else if (res.status === 404) {
          // Fall back to the existing /api/academics endpoint (bare array).
          res = await fetch('/api/academics', { cache: 'no-store' })
          if (res.ok) arr = asSubjects(await res.json())
        }
        if (cancelled) return
        if (arr && arr.length > 0) {
          setSubjects(arr)
          setSubjectsError(false)
          setSelectedId((prev) => prev ?? arr![0].id)
        } else {
          setSubjects([])
          setSubjectsError(true)
        }
      } catch {
        if (cancelled) return
        setSubjects([])
        setSubjectsError(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // -----------------------------------------------------------------------
  // Readiness fetch — fires when the selected subject changes or when the
  // user clicks refresh. Kept as a stable callback so the effect below only
  // re-runs when `selectedId` changes (not on every render).
  // -----------------------------------------------------------------------
  const loadReadiness = useCallback(async (subjectId: string, isRefresh: boolean) => {
    setLoading(true)
    setError(false)
    if (isRefresh) setRefreshing(true)
    try {
      const res = await fetch('/api/analytics/readiness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId }),
        cache: 'no-store',
      })
      const json = (await res.json()) as { ok?: boolean; data?: ReadinessResult }
      if (json.ok && json.data) {
        setData(json.data)
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (selectedId) void loadReadiness(selectedId, false)
  }, [selectedId, loadReadiness])

  const onRefresh = useCallback(() => {
    if (selectedId && !refreshing) void loadReadiness(selectedId, true)
  }, [selectedId, loadReadiness, refreshing])

  const onRetry = useCallback(() => {
    if (selectedId) void loadReadiness(selectedId, true)
  }, [selectedId, loadReadiness])

  const onSelectSubject = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? prev : id))
  }, [])

  // -----------------------------------------------------------------------
  // Derived
  // -----------------------------------------------------------------------
  const score = data?.readinessScore ?? 0
  const gauge = useMemo(() => gaugeMeta(score), [score])
  const targetOffset = GAUGE_C * (1 - score / 100)

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  // --- Subject list unavailable ---
  if (subjects && subjects.length === 0) {
    return (
      <Card className={cn('card-lift', className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Exam Readiness
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            {subjectsError
              ? 'No subjects available — add a subject in the academic setup to see your readiness prediction.'
              : 'No subjects available right now. Please try again later.'}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('card-lift relative overflow-hidden', className)}>
      {/* Frosted top accent — mirrors the streak-freeze-widget pattern */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-24 pointer-events-none opacity-60"
        style={{
          background:
            'radial-gradient(120% 80% at 0% 0%, color-mix(in oklch, var(--primary) 14%, transparent), transparent 60%), radial-gradient(120% 80% at 100% 0%, color-mix(in oklch, var(--primary) 10%, transparent), transparent 60%)',
        }}
      />

      {/* ---------- Header ---------- */}
      <CardHeader className="pb-3 relative">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Exam Readiness
            </CardTitle>
            {data && !loading && (
              <p className="text-meta text-muted-foreground">
                Generated {timeAgo(data.generatedAt)}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onRefresh}
            disabled={!selectedId || refreshing || loading}
            aria-label="Refresh readiness prediction"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 relative">
        {/* ---------- Subject selector ---------- */}
        {subjects === null ? (
          <div className="flex gap-2 overflow-hidden">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-8 w-24 rounded-full skeleton-premium shrink-0"
              />
            ))}
          </div>
        ) : (
          <SubjectPillRow
            subjects={subjects}
            selectedId={selectedId}
            onSelect={onSelectSubject}
          />
        )}

        {/* ---------- Body ---------- */}
        {loading && !data ? (
          <ReadinessSkeleton />
        ) : error && !data ? (
          <ReadinessError onRetry={onRetry} />
        ) : data ? (
          <ReadinessBody
            data={data}
            animateMotion={animateMotion}
            gaugeColorClass={gauge.colorClass}
            gaugeLabel={gauge.label}
            targetOffset={targetOffset}
          />
        ) : null}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Subject pill row
// ---------------------------------------------------------------------------

interface SubjectPillRowProps {
  subjects: Subject[]
  selectedId: string | null
  onSelect: (id: string) => void
}

function SubjectPillRow({ subjects, selectedId, onSelect }: SubjectPillRowProps) {
  return (
    <div
      className="scroll-area-lernio flex gap-2 overflow-x-auto pb-2 -mx-1 px-1"
      role="tablist"
      aria-label="Select a subject"
    >
      {subjects.map((s) => {
        const selected = s.id === selectedId
        const dotColor = s.accentColor || '#7c3aed'
        return (
          <button
            key={s.id}
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(s.id)}
            className={cn(
              'inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium whitespace-nowrap shrink-0 border transition-colors',
              selected
                ? 'bg-primary/10 text-primary border-primary/40 ring-2 ring-primary/30'
                : 'bg-background text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <span
              className="size-2 rounded-full shrink-0"
              style={{ backgroundColor: dotColor }}
              aria-hidden
            />
            <span className="truncate max-w-[140px]">{s.name}</span>
          </button>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skeleton loading state
// ---------------------------------------------------------------------------

function ReadinessSkeleton() {
  return (
    <div className="space-y-5">
      {/* Gauge skeleton */}
      <div className="flex flex-col items-center gap-3 py-2">
        <div
          className="rounded-full skeleton-premium"
          style={{ width: GAUGE_SIZE, height: GAUGE_SIZE }}
          aria-label="Loading readiness score"
        />
      </div>
      {/* Strengths / weaknesses / recommendations skeleton lines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-4 w-full rounded skeleton-premium" />
          ))}
        </div>
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-4 w-full rounded skeleton-premium" />
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-4 w-full rounded skeleton-premium" />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

function ReadinessError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <AlertTriangle className="h-8 w-8 text-muted-foreground/70" />
      <p className="text-sm text-muted-foreground">
        Couldn&apos;t generate readiness prediction.
      </p>
      <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
        <RefreshCw className="h-3.5 w-3.5" />
        Tap to retry
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Body — gauge + strengths/weaknesses + recommendations + inputs
// ---------------------------------------------------------------------------

interface ReadinessBodyProps {
  data: ReadinessResult
  animateMotion: boolean
  gaugeColorClass: string
  gaugeLabel: string
  targetOffset: number
}

function ReadinessBody({
  data,
  animateMotion,
  gaugeColorClass,
  gaugeLabel,
  targetOffset,
}: ReadinessBodyProps) {
  const score = data.readinessScore
  const animatedScore = useCountUp(score, 800, animateMotion)

  // When motion is disabled, snap stroke to final offset immediately.
  const strokeMotion = animateMotion

  return (
    <div className="space-y-5">
      {/* ---------- Gauge ---------- */}
      <div className="flex flex-col items-center gap-3 pt-1">
        <div
          className="relative inline-flex items-center justify-center"
          style={{ width: GAUGE_SIZE, height: GAUGE_SIZE }}
        >
          <svg
            width={GAUGE_SIZE}
            height={GAUGE_SIZE}
            className={cn('-rotate-90', gaugeColorClass)}
            aria-hidden
          >
            {/* Track */}
            <circle
              cx={GAUGE_SIZE / 2}
              cy={GAUGE_SIZE / 2}
              r={GAUGE_R}
              fill="none"
              stroke="var(--muted)"
              strokeWidth={GAUGE_STROKE}
              opacity={0.55}
            />
            {/* Filled arc — animated stroke-dashoffset */}
            {strokeMotion ? (
              <motion.circle
                key={data.generatedAt}
                cx={GAUGE_SIZE / 2}
                cy={GAUGE_SIZE / 2}
                r={GAUGE_R}
                fill="none"
                stroke="currentColor"
                strokeWidth={GAUGE_STROKE}
                strokeLinecap="round"
                strokeDasharray={GAUGE_C}
                initial={{ strokeDashoffset: GAUGE_C }}
                animate={{ strokeDashoffset: targetOffset }}
                transition={{
                  type: 'spring',
                  stiffness: 90,
                  damping: 18,
                  mass: 1.1,
                }}
                style={{
                  filter: 'drop-shadow(0 0 6px color-mix(in oklch, currentColor 45%, transparent))',
                }}
              />
            ) : (
              <circle
                cx={GAUGE_SIZE / 2}
                cy={GAUGE_SIZE / 2}
                r={GAUGE_R}
                fill="none"
                stroke="currentColor"
                strokeWidth={GAUGE_STROKE}
                strokeLinecap="round"
                strokeDasharray={GAUGE_C}
                strokeDashoffset={targetOffset}
              />
            )}
          </svg>
          {/* Inner number + label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span
              className={cn('text-4xl font-bold tabular-nums leading-none', gaugeColorClass)}
            >
              {animatedScore}
            </span>
            <span className="text-meta text-muted-foreground mt-1">% ready</span>
            <span className={cn('text-meta font-medium mt-0.5', gaugeColorClass)}>
              {gaugeLabel}
            </span>
          </div>
        </div>

        {/* Days-to-exam badge */}
        {data.inputs.daysToExam !== null ? (
          <Badge
            variant="outline"
            className="gap-1.5 bg-primary/5 border-primary/30"
          >
            <Calendar className="h-3.5 w-3.5" />
            Days to exam: {data.inputs.daysToExam}
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1.5 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            Exam date not set — set it in Profile
          </Badge>
        )}

        {/* Fallback warning chip */}
        {data.usedFallback && (
          <Badge
            variant="outline"
            className="gap-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            AI unavailable — showing heuristic estimate
          </Badge>
        )}
      </div>

      {/* ---------- Strengths / Weaknesses ---------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <StrengthsCard items={data.strengths} animateMotion={animateMotion} />
        <WeaknessesCard items={data.weaknesses} animateMotion={animateMotion} />
      </div>

      {/* ---------- Recommendations ---------- */}
      <RecommendationsCard
        items={data.recommendations}
        animateMotion={animateMotion}
      />

      {/* ---------- Inputs disclosure ---------- */}
      <InputsDisclosure inputs={data.inputs} open={false} />

      {/* ---------- Disclaimer ---------- */}
      <p
        className={cn(
          'text-meta text-muted-foreground/80 pt-1 border-t border-border/60 text-center',
          data.usedFallback && 'opacity-60',
        )}
      >
        AI estimate by LEO · {formatTimestamp(data.generatedAt)}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Strengths / Weaknesses cards
// ---------------------------------------------------------------------------

function StrengthsCard({
  items,
  animateMotion,
}: {
  items: string[]
  animateMotion: boolean
}) {
  return (
    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
        <h4 className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          Strengths
        </h4>
      </div>
      {items.length === 0 ? (
        <p className="text-meta text-muted-foreground">
          Keep practising to discover your strengths.
        </p>
      ) : (
        <motion.ul
          className="space-y-1.5"
          initial={animateMotion ? 'hidden' : false}
          animate="show"
          variants={{
            hidden: { opacity: 1 },
            show: { opacity: 1, transition: { staggerChildren: 0.05 } },
          }}
        >
          {items.map((s, i) => (
            <motion.li
              key={`${i}-${s}`}
              className="flex items-start gap-1.5 text-meta leading-snug"
              variants={
                animateMotion
                  ? {
                      hidden: { opacity: 0, x: -6 },
                      show: { opacity: 1, x: 0 },
                    }
                  : undefined
              }
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span>{s}</span>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </div>
  )
}

function WeaknessesCard({
  items,
  animateMotion,
}: {
  items: string[]
  animateMotion: boolean
}) {
  return (
    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
        <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-300">
          Weaknesses
        </h4>
      </div>
      {items.length === 0 ? (
        <p className="text-meta text-muted-foreground">
          No significant weaknesses detected.
        </p>
      ) : (
        <motion.ul
          className="space-y-1.5"
          initial={animateMotion ? 'hidden' : false}
          animate="show"
          variants={{
            hidden: { opacity: 1 },
            show: { opacity: 1, transition: { staggerChildren: 0.05 } },
          }}
        >
          {items.map((s, i) => (
            <motion.li
              key={`${i}-${s}`}
              className="flex items-start gap-1.5 text-meta leading-snug"
              variants={
                animateMotion
                  ? {
                      hidden: { opacity: 0, x: -6 },
                      show: { opacity: 1, x: 0 },
                    }
                  : undefined
              }
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
              <span>{s}</span>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Recommendations card
// ---------------------------------------------------------------------------

function RecommendationsCard({
  items,
  animateMotion,
}: {
  items: Recommendation[]
  animateMotion: boolean
}) {
  return (
    <div className="rounded-lg border border-border bg-card/50 p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Lightbulb className="h-3.5 w-3.5 text-primary" />
        <h4 className="text-xs font-semibold">Recommended Next Steps</h4>
      </div>
      {items.length === 0 ? (
        <p className="text-meta text-muted-foreground">
          You&apos;re on track — keep up the great work!
        </p>
      ) : (
        <motion.ul
          className="space-y-2.5"
          initial={animateMotion ? 'hidden' : false}
          animate="show"
          variants={{
            hidden: { opacity: 1 },
            show: { opacity: 1, transition: { staggerChildren: 0.05 } },
          }}
        >
          {items.map((r, i) => {
            const pm = priorityMeta(r.priority)
            return (
              <motion.li
                key={`${i}-${r.action}`}
                className="flex flex-col gap-1"
                variants={
                  animateMotion
                    ? {
                        hidden: { opacity: 0, y: 6 },
                        show: { opacity: 1, y: 0 },
                      }
                    : undefined
                }
              >
                <div className="flex items-start gap-2">
                  <Badge
                    variant="outline"
                    className={cn('shrink-0 text-meta px-1.5 py-0', pm.className)}
                  >
                    {pm.label}
                  </Badge>
                  <span className="text-meta font-medium leading-snug">
                    {r.action}
                  </span>
                </div>
                {r.reason && (
                  <span className="text-meta text-muted-foreground pl-2 leading-snug">
                    {r.reason}
                  </span>
                )}
              </motion.li>
            )
          })}
        </motion.ul>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Inputs disclosure
// ---------------------------------------------------------------------------

function InputsDisclosure({
  inputs,
  open: initialOpen,
}: {
  inputs: ReadinessInputs
  open: boolean
}) {
  const [open, setOpen] = useState(initialOpen)

  const rows: Array<{ icon: typeof Clock; label: string; value: string }> = [
    {
      icon: Target,
      label: 'Lessons',
      value: `${inputs.lessonsCompleted}/${inputs.lessonsAvailable}`,
    },
    {
      icon: TrendingUp,
      label: 'Accuracy',
      value: `${inputs.accuracy}%`,
    },
    {
      icon: CheckCircle2,
      label: 'Questions',
      value: `${inputs.questionsCorrect}/${inputs.questionsAttempted}`,
    },
    {
      icon: Target,
      label: 'Quizzes',
      value: `${inputs.quizzesTaken} (avg ${inputs.avgQuizScore})`,
    },
    {
      icon: Clock,
      label: 'Focus',
      value: `${inputs.focusMinutes}m`,
    },
    {
      icon: RefreshCw,
      label: 'Revision',
      value: `${inputs.revisionCount}`,
    },
    {
      icon: CheckCircle2,
      label: 'Mastered topics',
      value: `${inputs.masteredTopics}`,
    },
    {
      icon: AlertTriangle,
      label: 'Weak topics',
      value: `${inputs.weakTopics}`,
    },
    {
      icon: Calendar,
      label: 'Days to exam',
      value: inputs.daysToExam === null ? '—' : `${inputs.daysToExam}`,
    },
  ]

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between h-8 text-xs text-muted-foreground hover:text-foreground"
        >
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Inputs analyzed by AI
          </span>
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 transition-transform',
              open && 'rotate-180',
            )}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-2 pb-1">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-2 text-meta py-1 border-b border-border/40 last:border-0"
            >
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <row.icon className="h-3 w-3 shrink-0" />
                {row.label}
              </span>
              <span className="font-medium tabular-nums text-right">
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

// ---------------------------------------------------------------------------
// Misc helpers
// ---------------------------------------------------------------------------

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  } catch {
    return iso
  }
}

'use client'

/**
 * SubjectReadinessRadar — Phase 13 (Task 13-C)
 * --------------------------------------------
 * Premium radar overlay that paints all 4 subjects' exam-readiness scores on a
 * single chart, so the student can instantly see which subject needs the most
 * attention.
 *
 * Fetches `GET /api/analytics/readiness/all` on mount and auto-refreshes every
 * 60 seconds (skipped when the user's `lowPower` pref is on or when the
 * `prefers-reduced-motion` media query matches — both are accessibility wins on
 * battery-constrained devices).
 *
 * UX highlights:
 *   - Big Recharts RadarChart: one polygon across all subjects, primary fill at
 *     30% opacity / full-opacity stroke, PolarGrid rings, PolarAngleAxis labelled
 *     with subject codes (CS201…), PolarRadiusAxis [0,100] with hidden labels.
 *   - Custom tooltip showing subject name + readinessScore + bucket label.
 *   - 4-subject grid (2 cols mobile, 4 cols lg): compact cards with the big
 *     bucket-coloured score number, bucket label, mini progress bar (subject
 *     accent fill), and a hover tooltip with the raw inputs.
 *   - Footer strip: "Overall readiness: N%" with a wide progress bar + bucket.
 *   - Bucket legend: 5 coloured dots (Critical / Low / Medium / High / Ready).
 *
 * Motion:
 *   - Chart container: Framer Motion `opacity 0→1` + `scale 0.95→1` over 600ms
 *     with spring easing.
 *   - Subject cards: staggered entrance (50ms per card).
 *   - Card hover: subtle lift + glow.
 *   - `prefers-reduced-motion` collapses everything; `usePrefs().lowPower`
 *     additionally disables the 60s auto-refresh.
 */

import { useCallback, useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Radar as RadarIcon,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  Clock,
  Loader2,
  Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePrefs } from '@/components/theme-provider'

// ---------------------------------------------------------------------------
// Types — mirror the API response shape from /api/analytics/readiness/all
// ---------------------------------------------------------------------------

type Bucket = 'critical' | 'low' | 'medium' | 'high' | 'ready'

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
}

interface SubjectReadiness {
  subjectId: string
  subjectName: string
  subjectCode: string
  subjectAccent: string
  credits: number
  readinessScore: number
  inputs: ReadinessInputs
  bucket: Bucket
}

interface ReadinessAllData {
  subjects: SubjectReadiness[]
  overall: number
  generatedAt: string
}

interface ApiResponse {
  ok: boolean
  data?: ReadinessAllData
}

/** Single row passed to Recharts RadarChart. */
interface RadarDataPoint {
  code: string
  name: string
  score: number
  bucket: Bucket
}

// ---------------------------------------------------------------------------
// Bucket metadata — colours + labels. critical/low/medium/high/ready mirror the
// heuristic in /api/analytics/readiness/all/route.ts.
// ---------------------------------------------------------------------------

interface BucketMeta {
  label: string
  /** CSS color value used for the score number, bucket label, legend dot. */
  color: string
}

const BUCKET_META: Record<Bucket, BucketMeta> = {
  critical: { label: 'Critical', color: 'oklch(0.64 0.22 25)' },   // rose-500
  low: { label: 'Low', color: 'oklch(0.70 0.18 70)' },             // amber-500
  medium: { label: 'Medium', color: 'oklch(0.74 0.17 75)' },       // amber-400
  high: { label: 'High', color: 'oklch(0.70 0.17 155)' },          // emerald-500
  ready: { label: 'Ready', color: 'var(--primary)' },
}

function bucketMeta(bucket: Bucket): BucketMeta {
  return BUCKET_META[bucket] ?? BUCKET_META.medium
}

/** Bucket an arbitrary 0-100 score (used for the overall footer strip). */
function bucketize(score: number): Bucket {
  if (score < 15) return 'critical'
  if (score < 35) return 'low'
  if (score < 60) return 'medium'
  if (score < 85) return 'high'
  return 'ready'
}

// ---------------------------------------------------------------------------
// Time-ago helper — matches the format used elsewhere in the app.
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Custom radar tooltip — Recharts injects `active` + `payload`.
// ---------------------------------------------------------------------------

interface RadarTooltipProps {
  active?: boolean
  payload?: Array<{ payload: RadarDataPoint }>
}

function RadarTooltipContent({ active, payload }: RadarTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const item = payload[0].payload
  if (!item) return null
  const meta = bucketMeta(item.bucket)
  return (
    <div
      className="rounded-lg border border-border bg-card px-3 py-2 shadow-soft"
      style={{ fontSize: 12 }}
    >
      <div className="font-semibold leading-tight text-foreground">{item.name}</div>
      <div className="text-meta font-mono text-muted-foreground">{item.code}</div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className="text-base font-bold tabular-nums" style={{ color: meta.color }}>
          {item.score}
        </span>
        <span className="text-meta text-muted-foreground">/ 100</span>
      </div>
      <div className="text-meta font-medium" style={{ color: meta.color }}>
        {meta.label}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Subject card — compact cell for the 4-subject grid.
// ---------------------------------------------------------------------------

interface SubjectCardProps {
  subject: SubjectReadiness
  index: number
  reduced: boolean
}

function SubjectCard({ subject, index, reduced }: SubjectCardProps) {
  const meta = bucketMeta(subject.bucket)
  const accent = subject.subjectAccent || 'var(--primary)'
  const inputs = subject.inputs
  const lessonsTotal = inputs.lessonsAvailable
  const lessonsDone = Math.min(inputs.lessonsCompleted, lessonsTotal)

  // Subject-accent-coloured progress bar via a CSS variable on the indicator.
  const progressStyle = {
    '--subject-accent': accent,
  } as React.CSSProperties

  const initial = reduced ? false : { opacity: 0, y: 10 }
  const animate = { opacity: 1, y: 0 }
  const transition = reduced
    ? { duration: 0 }
    : { delay: Math.min(index * 0.05, 0.3), duration: 0.35, ease: 'easeOut' as const }
  const whileHover = reduced ? undefined : { y: -3, scale: 1.02 }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          role="group"
          aria-label={`${subject.subjectName}: readiness ${subject.readinessScore} out of 100, ${meta.label}`}
          tabIndex={0}
          initial={initial}
          animate={animate}
          transition={transition}
          whileHover={whileHover}
          className={cn(
            'relative rounded-xl border border-border bg-card/60 p-3 outline-none',
            'transition-shadow duration-200',
            'hover:shadow-soft-lg hover:border-primary/30',
            'focus-visible:ring-2 focus-visible:ring-ring/60',
          )}
          style={progressStyle}
        >
          {/* Header row: accent dot + truncated name + credits badge */}
          <div className="flex items-center gap-2 min-w-0">
            <span
              aria-hidden
              className="size-2 rounded-full shrink-0"
              style={{ backgroundColor: accent }}
            />
            <p className="text-xs font-medium truncate flex-1">{subject.subjectName}</p>
            <Badge variant="outline" className="text-meta px-1.5 py-0 h-4 shrink-0 tabular-nums">
              {subject.credits} cr
            </Badge>
          </div>

          {/* Score row */}
          <div className="mt-2 flex items-baseline gap-1.5">
            <span
              className="text-[28px] leading-none font-bold tabular-nums"
              style={{ color: meta.color }}
            >
              {subject.readinessScore}
            </span>
            <span className="text-meta text-muted-foreground">/ 100</span>
          </div>

          {/* Bucket label */}
          <p
            className="mt-0.5 text-meta font-medium"
            style={{ color: meta.color }}
          >
            {meta.label}
          </p>

          {/* Mini progress bar with subject-accent fill */}
          <Progress
            value={subject.readinessScore}
            className="mt-2 h-1.5 [&>[data-slot=progress-indicator]]:bg-[var(--subject-accent)]"
          />
        </motion.div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px] text-left">
        <div className="font-semibold leading-tight">{subject.subjectName}</div>
        <div className="mt-0.5 text-meta opacity-80">
          {subject.subjectCode} · {subject.credits} credits
        </div>
        <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 text-meta">
          <div className="opacity-80">Lessons</div>
          <div className="tabular-nums text-right">
            {lessonsDone}/{lessonsTotal}
          </div>
          <div className="opacity-80">Accuracy</div>
          <div className="tabular-nums text-right">{inputs.accuracy}%</div>
          <div className="opacity-80">Focus</div>
          <div className="tabular-nums text-right">{inputs.focusMinutes}m</div>
          <div className="opacity-80">Mastered</div>
          <div className="tabular-nums text-right">{inputs.masteredTopics}</div>
          <div className="opacity-80">Weak</div>
          <div className="tabular-nums text-right">{inputs.weakTopics}</div>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

// ---------------------------------------------------------------------------
// Skeleton — shown on first load. One big block for the chart + 4 small blocks.
// ---------------------------------------------------------------------------

function RadarSkeleton() {
  return (
    <Card className="card-lift">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg skeleton-premium" />
            <div className="space-y-1">
              <div className="h-3.5 w-44 rounded skeleton-premium" />
              <div className="h-2.5 w-28 rounded skeleton-premium" />
            </div>
          </div>
          <div className="h-8 w-8 rounded-full skeleton-premium" />
        </div>
        {/* Chart block */}
        <div className="h-72 w-full rounded-xl skeleton-premium" />
        {/* Subject cell blocks */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl skeleton-premium" />
          ))}
        </div>
        {/* Footer strip */}
        <div className="h-12 rounded-lg skeleton-premium" />
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

interface ErrorStateProps {
  onRetry: () => void
  refreshing: boolean
}

function ErrorState({ onRetry, refreshing }: ErrorStateProps) {
  return (
    <Card className="card-lift">
      <CardContent className="py-8 flex flex-col items-center gap-3 text-center">
        <AlertTriangle className="h-7 w-7 text-muted-foreground/60" />
        <p className="text-sm text-muted-foreground">Couldn&rsquo;t load readiness data.</p>
        <Button size="sm" variant="outline" onClick={onRetry} disabled={refreshing}>
          {refreshing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Tap to retry
        </Button>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <Card className="card-lift">
      <CardContent className="py-8 flex flex-col items-center gap-2 text-center">
        <Layers className="h-7 w-7 text-muted-foreground/60" />
        <p className="text-sm text-muted-foreground">
          No subjects found. Contact your admin to set up your syllabus.
        </p>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SubjectReadinessRadar() {
  const prefersReduced = useReducedMotion()
  const reduced = prefersReduced === true
  const { pref } = usePrefs()

  const [data, setData] = useState<ReadinessAllData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // -------------------------------------------------------------------------
  // Load — stable callback so the 60s interval effect doesn't re-subscribe.
  // -------------------------------------------------------------------------
  const load = useCallback(async () => {
    setRefreshing(true)
    setError(false)
    try {
      const res = await fetch('/api/analytics/readiness/all', { cache: 'no-store' })
      const json = (await res.json()) as ApiResponse
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
    void load()
    // Auto-refresh every 60s — skipped when low-power is enabled (saves
    // battery on mid-session devices) or when reduced motion is requested
    // (both signals a "leave me alone" intent). Also skipped while the tab
    // is hidden, with a catch-up on focus.
    if (pref.lowPower || reduced) return
    const t = setInterval(() => {
      if (!document.hidden) void load()
    }, 60_000)
    const onVis = () => { if (!document.hidden) void load() }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [load, pref.lowPower, reduced])

  // -------------------------------------------------------------------------
  // Render: loading skeleton
  // -------------------------------------------------------------------------
  if (loading && !data) {
    return <RadarSkeleton />
  }

  // -------------------------------------------------------------------------
  // Render: hard error (no cached data)
  // -------------------------------------------------------------------------
  if (error && !data) {
    return <ErrorState onRetry={() => void load()} refreshing={refreshing} />
  }

  // -------------------------------------------------------------------------
  // Render: empty state
  // -------------------------------------------------------------------------
  if (data && data.subjects.length === 0) {
    return <EmptyState />
  }

  if (!data) return null

  // -------------------------------------------------------------------------
  // Derived — radar data + overall bucket
  // -------------------------------------------------------------------------
  const radarData: RadarDataPoint[] = data.subjects.map((s) => ({
    code: s.subjectCode,
    name: s.subjectName,
    score: s.readinessScore,
    bucket: s.bucket,
  }))

  const overallBucket = bucketize(data.overall)
  const overallMeta = bucketMeta(overallBucket)
  const overallStyle = {
    '--overall-color': overallMeta.color,
  } as React.CSSProperties

  // Chart container motion: opacity 0→1 + scale 0.95→1, spring over 600ms.
  const chartInitial = reduced ? false : { opacity: 0, scale: 0.95 }
  const chartAnimate = { opacity: 1, scale: 1 }
  const chartTransition = reduced
    ? { duration: 0 }
    : { type: 'spring' as const, duration: 0.6, bounce: 0.3 }

  return (
    <Card className="card-lift relative overflow-hidden">
      {/* Frosted top accent — mirrors the exam-readiness-widget pattern */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-24 pointer-events-none opacity-60"
        style={{
          background:
            'radial-gradient(120% 80% at 0% 0%, color-mix(in oklch, var(--primary) 14%, transparent), transparent 60%), radial-gradient(120% 80% at 100% 0%, color-mix(in oklch, var(--primary) 10%, transparent), transparent 60%)',
        }}
      />

      <CardHeader className="pb-3 relative">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <CardTitle className="text-sm flex items-center gap-2">
              <RadarIcon className="h-4 w-4 text-primary" />
              Subject Readiness Radar
            </CardTitle>
            <p className="text-meta text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Generated {timeAgo(data.generatedAt)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => void load()}
            disabled={refreshing}
            aria-label="Refresh subject readiness radar"
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
        {/* ── Big radar chart ─────────────────────────────────────────────── */}
        <motion.div
          initial={chartInitial}
          animate={chartAnimate}
          transition={chartTransition}
          className="h-72 sm:h-80 mx-auto"
        >
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} outerRadius="78%">
              <PolarGrid
                stroke="var(--border)"
                strokeOpacity={0.6}
                gridType="circle"
              />
              <PolarAngleAxis
                dataKey="code"
                tick={{ fill: 'var(--foreground)', fontSize: 11, fontWeight: 600 }}
              />
              <PolarRadiusAxis
                domain={[0, 100]}
                angle={90}
                tick={false}
                axisLine={false}
              />
              <Radar
                dataKey="score"
                stroke="var(--primary)"
                strokeWidth={2}
                fill="var(--primary)"
                fillOpacity={0.3}
                isAnimationActive={!reduced}
                animationDuration={600}
                dot={{ r: 3, fill: 'var(--primary)', strokeWidth: 0 }}
              />
              <RechartsTooltip content={<RadarTooltipContent />} />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* ── Bucket legend ───────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
          {(Object.keys(BUCKET_META) as Bucket[]).map((b) => {
            const m = bucketMeta(b)
            return (
              <div key={b} className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ backgroundColor: m.color }}
                />
                <span className="text-meta text-muted-foreground">{m.label}</span>
              </div>
            )
          })}
        </div>

        {/* ── 4-subject grid ──────────────────────────────────────────────── */}
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-3"
          initial={reduced ? false : 'hidden'}
          animate="show"
          variants={
            reduced
              ? { hidden: {}, show: {} }
              : { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
          }
        >
          {data.subjects.map((s, i) => (
            <SubjectCard key={s.subjectId} subject={s} index={i} reduced={reduced} />
          ))}
        </motion.div>

        {/* ── Footer strip: overall readiness ─────────────────────────────── */}
        <div
          className="rounded-xl border border-border bg-card/40 p-3"
          style={overallStyle}
        >
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <TrendingUp className="h-4 w-4 text-primary shrink-0" />
              <span className="text-xs font-medium truncate">Overall readiness</span>
            </div>
            <div className="flex items-baseline gap-1.5 shrink-0">
              <span
                className="text-lg font-bold tabular-nums"
                style={{ color: overallMeta.color }}
              >
                {data.overall}
              </span>
              <span className="text-meta text-muted-foreground">/ 100</span>
              <span
                className="ml-1 text-meta font-medium px-1.5 py-0.5 rounded-full"
                style={{
                  color: overallMeta.color,
                  backgroundColor: `color-mix(in oklch, ${overallMeta.color} 12%, transparent)`,
                }}
              >
                {overallMeta.label}
              </span>
            </div>
          </div>
          <Progress
            value={data.overall}
            className="h-2.5 [&>[data-slot=progress-indicator]]:bg-[var(--overall-color)]"
          />
        </div>
      </CardContent>
    </Card>
  )
}

export default SubjectReadinessRadar

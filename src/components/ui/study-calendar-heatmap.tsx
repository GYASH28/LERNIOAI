'use client'

/**
 * StudyCalendarHeatmap
 * --------------------
 * GitHub-style year-long study heatmap. Fetches
 * `GET /api/analytics/calendar?year=YYYY` and renders 53 weeks × 7 days of
 * rounded color-coded cells, plus stat pills, a year selector, month labels,
 * day-of-week labels, and a 5-level legend.
 *
 * Premium polish:
 *  - Per-column Framer Motion stagger (≈0.3s total) — disabled when the user
 *    has `prefers-reduced-motion` on (or low-power mode enabled).
 *  - Hover scale-110 + brightness-110 on every cell.
 *  - Best-day cell gets a `ring-2 ring-primary/60` glow.
 *  - Today's cell gets a tiny pulsing dot in the center.
 *  - Skeleton loading (10×10 grid) + muted error retry + mascot empty state.
 *
 * Single client component — owns its own data fetching so it can be dropped
 * into any view (Dashboard, Analytics, Profile) without prop plumbing.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Flame,
  Clock,
  Activity,
  TrendingUp,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Mascot } from '@/components/mascots/mascot'
import { usePrefs } from '@/components/theme-provider'
import { cn } from '@/lib/utils'

// ─── API types (mirror /api/analytics/calendar response) ────────────────────
type Level = 0 | 1 | 2 | 3 | 4

interface CalendarDay {
  date: string // YYYY-MM-DD
  xp: number
  minutes: number
  sessions: number
  level: Level
}

interface CalendarData {
  year: number
  totalXp: number
  totalMinutes: number
  activeDays: number
  bestDay: { date: string; xp: number } | null
  days: CalendarDay[]
}

// ─── Visual constants ───────────────────────────────────────────────────────
const LEVEL_BG: Record<Level, string> = {
  0: 'bg-muted/40',
  1: 'bg-primary/30',
  2: 'bg-primary/55',
  3: 'bg-primary/80',
  4: 'bg-primary',
}

const LEVEL_LEGEND: Array<{ level: Level; label: string }> = [
  { level: 0, label: 'None' },
  { level: 1, label: '<15m' },
  { level: 2, label: '15-30m' },
  { level: 3, label: '30-60m' },
  { level: 4, label: '60m+' },
]

const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
/** Rows (0=Sun..6=Sat) for which we render a day-of-week label. */
const VISIBLE_DAY_ROWS = [1, 3, 5] // Mon, Wed, Fri

const CELL_SIZE = 11 // px — matches GitHub's contribution graph
const CELL_GAP = 3 // px
const LABEL_COL_WIDTH = 28 // px — gutter for Mon/Wed/Fri labels

// ─── Date helpers ───────────────────────────────────────────────────────────
function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatBestDate(iso: string): string {
  // Parse YYYY-MM-DD as a local date so it doesn't shift a day back in UTC.
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  })
}

interface Cell {
  date: string | null
  day: CalendarDay | null
}

// ─── Component ───────────────────────────────────────────────────────────────
export function StudyCalendarHeatmap({ className }: { className?: string }) {
  const { pref } = usePrefs()
  // Framer Motion animations are skipped when the user has reduced motion
  // or low-power mode on (mirrors the mascot / focus-panel pattern).
  const animateMotion = !pref.reducedMotion && !pref.lowPower

  // Year selector — cycle through [currentYear-2, currentYear-1, currentYear]
  // (clamped to ≥2020 to match the API's lower bound).
  const currentYear = useMemo(() => new Date().getFullYear(), [])
  const yearOptions = useMemo(() => {
    const start = Math.max(2020, currentYear - 2)
    return Array.from(
      { length: currentYear - start + 1 },
      (_, i) => start + i,
    )
  }, [currentYear])
  const [yearIdx, setYearIdx] = useState(yearOptions.length - 1) // default to current year
  const year = yearOptions[yearIdx]

  const [data, setData] = useState<CalendarData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async (y: number) => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch(`/api/analytics/calendar?year=${y}`, {
        cache: 'no-store',
      })
      const json = await res.json()
      if (json.ok) {
        setData(json.data as CalendarData)
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(year)
  }, [year, load])

  // ─── Build grid layout (≤53 columns × 7 rows) ────────────────────────────
  // Jan 1 sits at row = day-of-week(Jan 1). Empty padding cells fill the
  // top of column 0 (before Jan 1) and the bottom of the last column.
  const grid = useMemo(() => {
    if (!data) return { columns: [] as Cell[][], monthLabelCols: [] as Array<number | null> }

    const jan1 = new Date(Date.UTC(data.year, 0, 1))
    const dow = jan1.getUTCDay() // 0=Sun..6=Sat
    const cells: Cell[] = []
    for (let i = 0; i < dow; i++) cells.push({ date: null, day: null })
    for (const d of data.days) cells.push({ date: d.date, day: d })
    while (cells.length % 7 !== 0) cells.push({ date: null, day: null })

    const columns: Cell[][] = []
    for (let i = 0; i < cells.length; i += 7) {
      columns.push(cells.slice(i, i + 7))
    }

    // Each month label sits above the column containing that month's 1st day.
    const dayToCol: Record<string, number> = {}
    columns.forEach((col, ci) => {
      for (const c of col) {
        if (c.date) dayToCol[c.date] = ci
      }
    })
    const monthLabelCols: Array<number | null> = []
    for (let m = 0; m < 12; m++) {
      const firstOfMonth = `${data.year}-${String(m + 1).padStart(2, '0')}-01`
      monthLabelCols.push(dayToCol[firstOfMonth] ?? null)
    }

    return { columns, monthLabelCols }
  }, [data])

  // ─── Loading state: 10×10 skeleton grid ──────────────────────────────────
  if (loading && !data) {
    return (
      <Card className={cn('card-lift', className)}>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg skeleton-premium" />
              <div className="h-4 w-40 rounded skeleton-premium" />
            </div>
            <div className="h-8 w-8 rounded-full skeleton-premium" />
          </div>
          <div className="flex justify-center pt-2 pb-4">
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(10, ${CELL_SIZE}px)`,
                gap: `${CELL_GAP}px`,
              }}
              aria-hidden
            >
              {Array.from({ length: 100 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-[2px] skeleton-premium"
                  style={{ width: `${CELL_SIZE}px`, height: `${CELL_SIZE}px` }}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ─── Error state ──────────────────────────────────────────────────────────
  if (error && !data) {
    return (
      <Card className={cn('card-lift', className)}>
        <CardContent className="p-6 flex flex-col items-center gap-3 text-center">
          <Calendar className="h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">Couldn&apos;t load calendar.</p>
          <Button variant="outline" size="sm" onClick={() => load(year)}>
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  // ─── Derived display values ────────────────────────────────────────────────
  const hours = Math.floor(data.totalMinutes / 60)
  const mins = data.totalMinutes % 60
  const todayStr = todayKey()
  const isCurrentYear = data.year === currentYear
  const numCols = grid.columns.length

  // ─── Cell renderer ─────────────────────────────────────────────────────────
  const renderCell = (cell: Cell, colIdx: number, rowIdx: number) => {
    if (!cell.date || !cell.day) {
      return (
        <div
          key={`empty-${colIdx}-${rowIdx}`}
          style={{ width: `${CELL_SIZE}px`, height: `${CELL_SIZE}px` }}
          aria-hidden
        />
      )
    }
    const isBest = data.bestDay?.date === cell.date
    const isToday = isCurrentYear && cell.date === todayStr
    const hasActivity = cell.day.minutes > 0 || cell.day.xp > 0
    const tooltipText = hasActivity
      ? `${cell.date} — ${cell.day.minutes}m studied, ${cell.day.xp} XP, ${cell.day.sessions} ${cell.day.sessions === 1 ? 'session' : 'sessions'}`
      : `No activity on ${cell.date}`

    const inner = (
      <div
        className={cn(
          'rounded-[2px] transition-all duration-150',
          'hover:scale-110 hover:brightness-110',
          LEVEL_BG[cell.day.level],
          isBest && 'ring-2 ring-primary/60',
        )}
        style={{ width: `${CELL_SIZE}px`, height: `${CELL_SIZE}px` }}
      >
        {isToday && (
          <span
            className="block rounded-full bg-foreground animate-pulse"
            style={{ width: '5px', height: '5px', margin: '3px auto 0' }}
            aria-hidden
          />
        )}
      </div>
    )

    return (
      <Tooltip key={`cell-${colIdx}-${rowIdx}`}>
        <TooltipTrigger asChild>
          {inner}
        </TooltipTrigger>
        <TooltipContent side="top" className="text-meta py-1 max-w-[220px]">
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Card className={cn('card-lift relative overflow-hidden', className)}>
      {/* Soft top gradient accent — matches FocusSessionsPanel premium header */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-24 pointer-events-none opacity-60"
        style={{
          background:
            'radial-gradient(120% 80% at 0% 0%, color-mix(in oklch, var(--primary) 14%, transparent), transparent 60%), radial-gradient(120% 80% at 100% 0%, color-mix(in oklch, oklch(0.65 0.22 25) 10%, transparent), transparent 60%)',
        }}
      />
      <CardContent className="p-4 space-y-4 relative">
        {/* ── Header: title + year selector ─────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 shadow-soft">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold leading-tight truncate">Study Calendar</h3>
              <p className="text-meta text-muted-foreground truncate">
                {loading
                  ? 'Loading…'
                  : `${data.activeDays} active ${data.activeDays === 1 ? 'day' : 'days'} in ${data.year}`}
              </p>
            </div>
          </div>
          {/* Year switcher — cycles through [currentYear-2, currentYear-1, currentYear] */}
          <div className="flex items-center gap-0.5 rounded-full border border-border bg-card/40 p-0.5">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-full"
              disabled={yearIdx === 0 || loading}
              onClick={() => setYearIdx((i) => Math.max(0, i - 1))}
              aria-label="Previous year"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span
              className="text-xs font-semibold tabular-nums w-10 text-center select-none"
              aria-live="polite"
            >
              {year}
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-full"
              disabled={yearIdx === yearOptions.length - 1 || loading}
              onClick={() => setYearIdx((i) => Math.min(yearOptions.length - 1, i + 1))}
              aria-label="Next year"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ── Stat pills ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <StatPill
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            label="Total"
            value={`${data.totalXp} XP`}
            tint="primary"
          />
          <StatPill
            icon={<Clock className="h-3.5 w-3.5" />}
            label="Study time"
            value={data.totalMinutes > 0 ? `${hours}h ${mins}m` : '0m'}
            tint="cyan"
          />
          <StatPill
            icon={<Activity className="h-3.5 w-3.5" />}
            label="Active days"
            value={`${data.activeDays}`}
            tint="emerald"
          />
          <StatPill
            icon={<Flame className="h-3.5 w-3.5" />}
            label="Best day"
            value={data.bestDay ? `${data.bestDay.xp} XP` : '—'}
            sub={data.bestDay ? `on ${formatBestDate(data.bestDay.date)}` : undefined}
            tint="amber"
          />
        </div>

        {/* ── Empty state banner (grid still renders below) ─────────────── */}
        {data.activeDays === 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-3">
            <Mascot mascot="leo" state="hinting" size={36} animated={animateMotion} />
            <p className="text-xs text-muted-foreground">
              No activity in {data.year} yet. Start a Focus Timer or complete a
              lesson to fill your calendar!
            </p>
          </div>
        )}

        {/* ── Heatmap grid (horizontal scroll on small screens) ─────────── */}
        <div className="overflow-x-auto pb-1 -mx-1 px-1">
          <div
            className="inline-grid"
            style={{
              gridTemplateColumns: `${LABEL_COL_WIDTH}px repeat(${numCols}, ${CELL_SIZE}px)`,
              gridTemplateRows: `16px repeat(7, ${CELL_SIZE}px)`,
              gap: `${CELL_GAP}px`,
            }}
            role="img"
            aria-label={`Study activity heatmap for ${data.year}. ${data.activeDays} active days.`}
          >
            {/* Top-left empty corner */}
            <div style={{ gridColumn: 1, gridRow: 1 }} aria-hidden />

            {/* Month labels (row 1) — placed at the column where each month starts */}
            {grid.monthLabelCols.map((col, m) =>
              col !== null ? (
                <div
                  key={`m-${m}`}
                  className="text-meta text-muted-foreground leading-none self-end pb-0.5 whitespace-nowrap"
                  style={{ gridColumn: col + 2, gridRow: 1 }}
                >
                  {MONTH_ABBR[m]}
                </div>
              ) : null,
            )}

            {/* Day-of-week labels (column 1, Mon/Wed/Fri only) */}
            {VISIBLE_DAY_ROWS.map((rowIdx) => (
              <div
                key={`d-${rowIdx}`}
                className="text-meta text-muted-foreground leading-none self-center text-right pr-1"
                style={{ gridColumn: 1, gridRow: rowIdx + 2 }}
              >
                {DAY_LABELS[rowIdx]}
              </div>
            ))}

            {/* Cells — each column is wrapped in a motion.div for stagger fade-in */}
            {grid.columns.map((col, ci) => {
              const colStyle: React.CSSProperties = {
                gridColumn: ci + 2,
                gridRow: `2 / span 7`,
                display: 'grid',
                gridTemplateRows: `repeat(7, ${CELL_SIZE}px)`,
                gap: `${CELL_GAP}px`,
              }
              // Stagger delay across all columns — 0.3s total for the grid.
              const delay = (ci / Math.max(1, numCols)) * 0.3
              const content = col.map((cell, ri) => renderCell(cell, ci, ri))

              if (animateMotion) {
                return (
                  <motion.div
                    key={`col-${ci}`}
                    style={colStyle}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15, delay }}
                  >
                    {content}
                  </motion.div>
                )
              }
              return (
                <div key={`col-${ci}`} style={colStyle}>
                  {content}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Legend ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 flex-wrap text-meta text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span>Less</span>
            <div className="flex items-center gap-1">
              {LEVEL_LEGEND.map((l) => (
                <Tooltip key={l.level}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn('rounded-[2px] cursor-help', LEVEL_BG[l.level])}
                      style={{ width: '11px', height: '11px' }}
                      aria-label={`Level ${l.level}: ${l.label}`}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-meta py-1">
                    {l.label}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
            <span>More</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap text-meta">
            {LEVEL_LEGEND.filter((l) => l.level > 0).map((l) => (
              <span key={l.level} className="inline-flex items-center gap-1">
                <span
                  className={cn('inline-block w-2 h-2 rounded-[2px]', LEVEL_BG[l.level])}
                  aria-hidden
                />
                {l.label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="text-center text-meta text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">{data.activeDays}</span>{' '}
          day{data.activeDays === 1 ? '' : 's'} active this year
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Stat pill helper ─────────────────────────────────────────────────────────
type Tint = 'primary' | 'amber' | 'emerald' | 'cyan'

const TINT_TXT: Record<Tint, string> = {
  primary: 'text-primary',
  amber: 'text-amber-500',
  emerald: 'text-emerald-500',
  cyan: 'text-cyan-500',
}

const TINT_BG: Record<Tint, string> = {
  primary: 'bg-primary/10',
  amber: 'bg-amber-500/10',
  emerald: 'bg-emerald-500/10',
  cyan: 'bg-cyan-500/10',
}

function StatPill({
  icon,
  label,
  value,
  sub,
  tint,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  tint: Tint
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card/40 p-2 min-w-0">
      <div
        className={cn(
          'h-7 w-7 rounded-md flex items-center justify-center shrink-0',
          TINT_BG[tint],
          TINT_TXT[tint],
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-meta text-muted-foreground leading-none uppercase tracking-wide">
          {label}
        </p>
        <p className="text-xs font-semibold leading-tight truncate">
          {value}
          {sub && <span className="text-muted-foreground font-normal"> · {sub}</span>}
        </p>
      </div>
    </div>
  )
}

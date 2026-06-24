'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mascot } from '@/components/mascots/mascot'
import { Timer, Flame, Clock, CalendarDays, Trophy, RefreshCw, Layers, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts'

// ─────────────────────────────────────────────────────────────────────────────
// Types — mirror the API response shape from /api/analytics/focus
// ─────────────────────────────────────────────────────────────────────────────
interface DailySeriesPoint {
  date: string
  minutes: number
  count: number
}

interface SubjectBreakdownRow {
  subjectId: string
  subjectName: string
  subjectCode: string
  color: string
  minutes: number
}

interface ActivityBreakdownRow {
  activity: string
  minutes: number
  count: number
}

interface FocusData {
  todayMins: number
  todayCount: number
  weekMins: number
  weekCount: number
  allMins: number
  allCount: number
  dailySeries: DailySeriesPoint[]
  subjectBreakdown: SubjectBreakdownRow[]
  activityBreakdown: ActivityBreakdownRow[]
  currentStreak: number
  bestDayMins: number
  avgMinsPerSession: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Activity metadata — colours + friendly labels for the activity breakdown.
// Colours are picked from the existing CSS variable palette / oklch accents so
// they stay light+dark safe and consistent with the rest of the app.
// ─────────────────────────────────────────────────────────────────────────────
const ACTIVITY_META: Record<string, { label: string; color: string }> = {
  learn: { label: 'Learn', color: 'var(--primary)' },
  practice: { label: 'Practice', color: 'oklch(0.62 0.16 155)' }, // emerald
  tutor: { label: 'AI Tutor', color: 'oklch(0.65 0.22 340)' }, // pink
  lab: { label: 'Labs', color: 'oklch(0.62 0.17 195)' }, // cyan
  coding: { label: 'Coding Lab', color: 'oklch(0.72 0.17 75)' }, // amber
  exam: { label: 'Exam', color: 'oklch(0.65 0.22 25)' }, // rose
}

const TOOLTIP_STYLE = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: '0.5rem',
  fontSize: '12px',
  color: 'var(--foreground)',
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export function FocusSessionsPanel() {
  const [data, setData] = useState<FocusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      setRefreshing(true)
      const res = await fetch('/api/analytics/focus')
      const json = await res.json()
      if (json.ok) setData(json.data as FocusData)
    } catch {
      /* swallow — panel degrades silently */
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
    // Refresh every 60s so today's minutes stay in sync mid-session, but
    // skip while the tab is hidden and catch up on focus.
    const t = setInterval(() => {
      if (!document.hidden) load()
    }, 60_000)
    const onVis = () => { if (!document.hidden) load() }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [load])

  // ── Loading state: 5 premium skeleton blocks ──────────────────────────────
  if (loading || !data) {
    return (
      <Card className="card-lift">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg skeleton-premium" />
              <div className="h-4 w-40 rounded skeleton-premium" />
            </div>
            <div className="h-8 w-8 rounded-full skeleton-premium" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-lg skeleton-premium" />
            ))}
          </div>
          <div className="h-56 rounded-lg skeleton-premium" />
        </CardContent>
      </Card>
    )
  }

  // ── Empty state: no focus sessions yet ────────────────────────────────────
  if (data.allCount === 0) {
    return (
      <Card className="card-lift">
        <CardContent className="p-6 flex flex-col items-center text-center gap-3">
          <Mascot mascot="leo" state="explaining" size={64} />
          <div>
            <h3 className="text-base font-semibold flex items-center justify-center gap-2">
              <Timer className="h-4 w-4 text-primary" />
              Focus Sessions
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Labs not your thing? Hit the Focus Timer (bottom-right) to start your first
              Pomodoro session!
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={refreshing} className="mt-1">
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            Refresh
          </Button>
        </CardContent>
      </Card>
    )
  }

  const isEmptySubject = data.subjectBreakdown.length === 0
  const subjectTotalMins = data.subjectBreakdown.reduce((s, r) => s + r.minutes, 0)
  const maxActivityMins = Math.max(1, ...data.activityBreakdown.map((a) => a.minutes))

  // Pre-compute daily series labels + heatmap intensities
  const dailyChartData = data.dailySeries.map((d) => ({
    ...d,
    // Short label: e.g. "23" (day-of-month). Tooltip shows full date.
    day: d.date.slice(8, 10),
  }))

  // ── Heatmap intensities (0..1) relative to bestDayMins ────────────────────
  const heatCells = data.dailySeries.map((d) => {
    let intensity = 0
    if (d.minutes > 0 && data.bestDayMins > 0) {
      intensity = Math.min(1, d.minutes / data.bestDayMins)
    }
    return { ...d, intensity }
  })

  return (
    <Card className="card-lift relative overflow-hidden">
      {/* Soft top gradient accent — matches DailyQuestsCard premium header */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-24 pointer-events-none opacity-60"
        style={{
          background:
            'radial-gradient(120% 80% at 0% 0%, color-mix(in oklch, var(--primary) 14%, transparent), transparent 60%), radial-gradient(120% 80% at 100% 0%, color-mix(in oklch, oklch(0.65 0.22 25) 10%, transparent), transparent 60%)',
        }}
      />

      <CardContent className="p-4 space-y-5 relative">
        {/* ── Premium header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/80 to-fuchsia-500/60 flex items-center justify-center shrink-0 shadow-soft">
              <Timer className="h-4.5 w-4.5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold leading-tight truncate">Focus Sessions</h3>
              <p className="text-[10px] text-muted-foreground truncate">
                Pomodoro analytics · {data.allCount} all-time sessions
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={load}
            disabled={refreshing}
            className="h-8 w-8 p-0 rounded-full"
            aria-label="Refresh focus analytics"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
          </Button>
        </div>

        {/* ── KPI tiles (2x2 / 4-col on lg) ──────────────────────────────── */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.05 } },
          }}
        >
          <KpiTile
            i={0}
            icon={<Clock className="h-4 w-4" />}
            value={<><span className="count-up">{data.todayMins}</span> min</>}
            label="Today's Focus"
            sub={`${data.todayCount} ${data.todayCount === 1 ? 'session' : 'sessions'}`}
            tint="primary"
          />
          <KpiTile
            i={1}
            icon={<CalendarDays className="h-4 w-4" />}
            value={<><span className="count-up">{data.weekMins}</span> min</>}
            label="This Week"
            sub={`${data.weekCount} ${data.weekCount === 1 ? 'session' : 'sessions'}`}
            tint="cyan"
          />
          <KpiTile
            i={2}
            icon={<Flame className="h-4 w-4" />}
            value={<><span className="count-up">{data.currentStreak}</span> days 🔥</>}
            label="Current Streak"
            sub="Don't break the chain"
            tint="amber"
          />
          <KpiTile
            i={3}
            icon={<Trophy className="h-4 w-4" />}
            value={<><span className="count-up">{data.allMins}</span> min</>}
            label="All-Time"
            sub={`${data.allCount} sessions · avg ${data.avgMinsPerSession}m`}
            tint="emerald"
          />
        </motion.div>

        {/* ── 14-day bar chart ───────────────────────────────────────────── */}
        <SubCard
          title="Last 14 Days"
          icon={<TrendingUp className="h-4 w-4 text-primary" />}
        >
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} vertical={false} />
                <XAxis dataKey="day" fontSize={10} tick={{ fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
                <YAxis fontSize={10} tick={{ fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} width={32} />
                <Tooltip
                  cursor={{ fill: 'color-mix(in oklch, var(--primary) 8%, transparent)' }}
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(_value: number, _name: string, item: { payload?: DailySeriesPoint }) => {
                    const p = item?.payload
                    if (!p) return [`${_value} min`, 'Focus']
                    return [`${p.minutes} min · ${p.count} ${p.count === 1 ? 'session' : 'sessions'}`, p.date]
                  }}
                />
                <Bar dataKey="minutes" fill="var(--primary)" radius={[5, 5, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SubCard>

        {/* ── Subject donut + Activity breakdown ─────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Subject donut */}
          <SubCard title="Subjects" icon={<Layers className="h-4 w-4 text-primary" />}>
            {isEmptySubject ? (
              <div className="h-52 flex flex-col items-center justify-center text-center px-4">
                <Mascot mascot="leo" state="hinting" size={40} animated={false} />
                <p className="text-xs text-muted-foreground mt-2">
                  Tag a focus session with a subject to see this!
                </p>
              </div>
            ) : (
              <div className="h-52 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.subjectBreakdown}
                      dataKey="minutes"
                      nameKey="subjectName"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={75}
                      paddingAngle={2}
                      stroke="var(--card)"
                      strokeWidth={2}
                    >
                      {data.subjectBreakdown.map((s) => (
                        <Cell key={s.subjectId} fill={s.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(value: number, _name: string, item: { payload?: SubjectBreakdownRow }) => {
                        const p = item?.payload
                        return [`${value} min`, p ? `${p.subjectName} (${p.subjectCode})` : 'Subject']
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Centre total */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="count-up text-xl font-bold leading-none">{subjectTotalMins}</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">total min</span>
                </div>
              </div>
            )}
            {!isEmptySubject && (
              <div className="flex flex-wrap gap-2 mt-2">
                {data.subjectBreakdown.slice(0, 6).map((s) => (
                  <span
                    key={s.subjectId}
                    className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: s.color }}
                      aria-hidden
                    />
                    {s.subjectCode}
                  </span>
                ))}
              </div>
            )}
          </SubCard>

          {/* Activity breakdown — horizontal bars */}
          <SubCard title="Activities" icon={<Timer className="h-4 w-4 text-primary" />}>
            {data.activityBreakdown.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-xs text-muted-foreground">
                No activities logged yet.
              </div>
            ) : (
              <div className="space-y-2">
                {data.activityBreakdown.map((a) => {
                  const meta = ACTIVITY_META[a.activity] ?? {
                    label: a.activity,
                    color: 'var(--primary)',
                  }
                  const pct = Math.round((a.minutes / maxActivityMins) * 100)
                  return (
                    <div
                      key={a.activity}
                      className="hover-soft rounded-lg p-2 border border-border/60"
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium">{meta.label}</span>
                        <span className="text-muted-foreground tabular-nums">
                          <span className="count-up">{a.minutes}</span> min ·{' '}
                          <span className="count-up">{a.count}</span>{' '}
                          {a.count === 1 ? 'session' : 'sessions'}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: meta.color }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </SubCard>
        </div>

        {/* ── 14-day heatmap strip ───────────────────────────────────────── */}
        <SubCard title="14-Day Heatmap" icon={<Flame className="h-4 w-4 text-primary" />}>
          <div className="flex items-center gap-1.5 flex-wrap">
            {heatCells.map((c) => (
              <div
                key={c.date}
                className="heat-cell h-6 w-6"
                style={
                  { ['--intensity' as string]: c.intensity } as React.CSSProperties
                }
                title={`${c.date} · ${c.minutes} min · ${c.count} ${c.count === 1 ? 'session' : 'sessions'}`}
                aria-label={`${c.date}: ${c.minutes} minutes, ${c.count} sessions`}
              />
            ))}
          </div>
          <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
            <span>Less</span>
            <div className="flex items-center gap-1">
              <div className="heat-cell h-3 w-3" style={{ ['--intensity' as string]: 0 } as React.CSSProperties} aria-hidden />
              <div className="heat-cell h-3 w-3" style={{ ['--intensity' as string]: 0.33 } as React.CSSProperties} aria-hidden />
              <div className="heat-cell h-3 w-3" style={{ ['--intensity' as string]: 0.66 } as React.CSSProperties} aria-hidden />
              <div className="heat-cell h-3 w-3" style={{ ['--intensity' as string]: 1 } as React.CSSProperties} aria-hidden />
            </div>
            <span>More</span>
          </div>
        </SubCard>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Local presentational helpers
// ─────────────────────────────────────────────────────────────────────────────
type Tint = 'primary' | 'amber' | 'emerald' | 'cyan' | 'rose'

const TINT_CLASS: Record<Tint, string> = {
  primary: 'stat-tile-tint-primary text-primary',
  amber: 'stat-tile-tint-amber text-amber-500',
  emerald: 'stat-tile-tint-emerald text-emerald-500',
  cyan: 'stat-tile-tint-cyan text-cyan-500',
  rose: 'stat-tile-tint-rose text-rose-500',
}

const TINT_ICON_BG: Record<Tint, string> = {
  primary: 'bg-primary/10',
  amber: 'bg-amber-500/10',
  emerald: 'bg-emerald-500/10',
  cyan: 'bg-cyan-500/10',
  rose: 'bg-rose-500/10',
}

function KpiTile({
  i,
  icon,
  value,
  label,
  sub,
  tint,
}: {
  i: number
  icon: React.ReactNode
  value: React.ReactNode
  label: string
  sub: string
  tint: Tint
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 8 },
        show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
      }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.05, duration: 0.25 }}
      className={cn('stat-tile p-3', TINT_CLASS[tint])}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', TINT_ICON_BG[tint])}>
          {icon}
        </div>
      </div>
      <p className="text-lg font-bold leading-none">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
      <p className="text-[9px] text-muted-foreground/70">{sub}</p>
    </motion.div>
  )
}

function SubCard({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-3">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
        <h4 className="text-sm font-semibold">{title}</h4>
      </div>
      {children}
    </div>
  )
}

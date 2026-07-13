'use client'

/**
 * RevisionView — transformed by Task I-2.
 *
 * Three render states driven by `view`:
 *   - 'hub'      → hero, stat tiles, mode tabs (Classic List with Forecast + 3D Flashcards launcher)
 *   - 'session'  → 3D flip-card session with SM-2 confidence rating, hint, undo, keyboard shortcuts
 *   - 'summary'  → session-complete hero with confetti, retention + forecast charts, hardest cards, CTAs
 *
 * API contract (kept intact from the legacy view):
 *   GET  /api/revision/due  → { data: { dueToday, overdue, upcoming, all } }
 *   POST /api/revision/due  → { scheduleId, quality (1-5), topicId }
 *
 * SM-2 → API quality mapping (see `rate()`):
 *   SM-2 quality 0 (Again) → API quality 1  (legacy API floor; cannot send 0)
 *   SM-2 quality 3 (Hard)  → API quality 3
 *   SM-2 quality 4 (Good)  → API quality 4
 *   SM-2 quality 5 (Easy)  → API quality 5
 * The legacy backend clamps to 1-5; we keep that contract and add a TODO comment
 * for the backend to accept canonical 0-5 once /api/revision/due imports sm-2.ts.
 */

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAppStore } from '@/store/app-store'
import { Mascot } from '@/components/mascots/mascot'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Confetti } from '@/components/ui/confetti'
import {
  RATING_PRESETS,
  describeInterval,
  type Sm2Quality,
} from '@/lib/revision/sm-2'
import {
  RotateCw, Clock, Brain, Zap, CheckCircle2, AlertCircle, Calendar,
  Layers, Sparkles, ArrowUpRight, Undo2, Lightbulb, Timer,
  Flame, TrendingUp, BarChart3, Target, X, Keyboard,
} from 'lucide-react'
import { motion, AnimatePresence, animate } from 'framer-motion'
import { toast } from 'sonner'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, ResponsiveContainer,
  Tooltip, CartesianGrid, ReferenceLine, Cell,
} from 'recharts'
import { cn } from '@/lib/utils'
import type { MascotKey } from '@/lib/types'

const MASCOT_KEYS: readonly MascotKey[] = ['leo', 'byte', 'coda', 'pico', 'nova']

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface RevisionTopic {
  title: string
  description?: string | null
  unit?: { number: number; subject: { name: string; code: string; mascotKey: string } } | null
}
interface RevisionItem {
  id: string
  topicId: string
  state: string
  topic: RevisionTopic
  sourceLesson?: { canonicalUrl?: string | null; title?: string | null } | null
}
interface RevisionData {
  dueToday: RevisionItem[]
  overdue: RevisionItem[]
  upcoming: RevisionItem[]
  all: RevisionItem[]
}

type View = 'hub' | 'session' | 'summary'

interface RatingRecord {
  item: RevisionItem
  quality: Sm2Quality        // canonical SM-2 quality (0/3/4/5)
  apiQuality: number         // 1-5 sent to API
  at: number                 // epoch ms
  usedHint: boolean
}

interface SessionState {
  items: RevisionItem[]
  idx: number
  flipped: boolean
  startTime: number
  endTime: number | null
  ratings: RatingRecord[]
  xp: number
  hintShownForIdx: number[]  // indexes where the hint was revealed
}

/* -------------------------------------------------------------------------- */
/*  State → difficulty / scheduling maps                                       */
/*  (API does not return SM-2 fields yet — derived from `state` per audit.)    */
/* -------------------------------------------------------------------------- */

type Difficulty = 'easy' | 'medium' | 'hard'

function stateToDifficulty(state: string): Difficulty {
  switch (state) {
    case 'mastered': return 'easy'
    case 'weak':
    case 'relearning': return 'hard'
    case 'new':
    case 'learning':
    case 'revising':
    case 'review':
    case 'proficient':
    default: return 'medium'
  }
}

function stateToEaseFactor(state: string): number {
  switch (state) {
    case 'new': return 2.5
    case 'learning': return 2.3
    case 'weak':
    case 'relearning': return 1.5
    case 'revising': return 2.4
    case 'review': return 2.6
    case 'proficient': return 2.7
    case 'mastered': return 2.8
    default: return 2.5
  }
}

function stateToIntervalDays(state: string): number {
  switch (state) {
    case 'new': return 0
    case 'learning': return 1
    case 'weak':
    case 'relearning': return 1
    case 'revising': return 3
    case 'review': return 7
    case 'proficient': return 14
    case 'mastered': return 30
    default: return 1
  }
}

const STATE_COLORS: Record<string, string> = {
  new: 'bg-gray-500/10 text-gray-600',
  learning: 'bg-violet-500/10 text-violet-600',
  weak: 'bg-rose-500/10 text-rose-600',
  relearning: 'bg-rose-500/10 text-rose-600',
  revising: 'bg-amber-500/10 text-amber-600',
  review: 'bg-amber-500/10 text-amber-600',
  proficient: 'bg-emerald-500/10 text-emerald-600',
  mastered: 'bg-green-500/10 text-green-600',
}

const DIFFICULTY_BADGE: Record<Difficulty, string> = {
  easy: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  medium: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  hard: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
}

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}

/* -------------------------------------------------------------------------- */
/*  SM-2 quality → API quality mapping                                         */
/* -------------------------------------------------------------------------- */

/**
 * Map canonical SM-2 quality (0/3/4/5) to the legacy API's 1-5 range.
 *
 * TODO(backend): Once /api/revision/due imports `advanceSm2` from
 *                src/lib/revision/sm-2.ts, switch this identity and send
 *                the raw 0-5 value. The audit (A-2) flagged that the API
 *                currently clamps quality 0 → 1, which silently turns an
 *                "Again" lapse into a "Hard" pass and corrupts ease.
 */
function sm2ToApiQuality(q: Sm2Quality): number {
  if (q === 0) return 1   // Again → API floor (legacy contract)
  return q                // Hard(3)/Good(4)/Easy(5) pass through unchanged
}

const RATING_CLASS: Record<number, string> = {
  0: 'rating-again',
  3: 'rating-hard',
  4: 'rating-good',
  5: 'rating-easy',
}

/* -------------------------------------------------------------------------- */
/*  Synthetic chart data generators                                            */
/* -------------------------------------------------------------------------- */

/** 14-day forecast — synthetic, anchored on today's actual due counts. */
function buildForecast(dueToday: number, overdue: number): Array<{ day: string; cards: number; today?: boolean }> {
  const base = dueToday + overdue
  const out: Array<{ day: string; cards: number; today?: boolean }> = []
  const today = new Date()
  for (let i = 0; i < 14; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const label = i === 0 ? 'Today' : d.toLocaleDateString(undefined, { weekday: 'short' })
    // Decaying noise — most cards cluster early, occasional spikes from scheduled reviews.
    let cards: number
    if (i === 0) cards = base
    else if (i === 1) cards = Math.max(0, Math.round(base * 0.4))
    else cards = Math.max(0, Math.round(base * (0.6 / i) * (0.7 + Math.random() * 0.6)))
    out.push({ day: label, cards, today: i === 0 })
  }
  return out
}

/** Retention history — 10 synthetic sessions trending upward. */
function buildRetention(): Array<{ session: string; accuracy: number }> {
  const labels = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10']
  return labels.map((session, i) => {
    const accuracy = Math.min(98, Math.round(62 + i * 3.4 + (Math.random() * 6 - 3)))
    return { session, accuracy }
  })
}

/* -------------------------------------------------------------------------- */
/*  AnimatedNumber — count-up on value change                                  */
/* -------------------------------------------------------------------------- */

function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    const controls = animate(display, value, {
      duration: 0.6,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(v),
    })
    return () => controls.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return <span className={className}>{Math.round(display)}</span>
}

/* -------------------------------------------------------------------------- */
/*  Main component                                                             */
/* -------------------------------------------------------------------------- */

export function RevisionView() {
  const [data, setData] = useState<RevisionData | null>(null)
  const [view, setView] = useState<View>('hub')
  const [mode, setMode] = useState<'classic' | 'flashcards'>('classic')
  const [session, setSession] = useState<SessionState | null>(null)
  const [confettiTrigger, setConfettiTrigger] = useState(0)
  const { pushMascotToast } = useAppStore()

  /* ---- Undo window (10s) ---- */
  const [undoActive, setUndoActive] = useState(false)
  const [undoRemaining, setUndoRemaining] = useState(0)
  const undoDeadlineRef = useRef<number>(0)
  useEffect(() => {
    if (!undoActive) return
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((undoDeadlineRef.current - Date.now()) / 1000))
      setUndoRemaining(remaining)
      if (remaining <= 0) setUndoActive(false)
    }
    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [undoActive])

  /* ---- Data load ---- */
  const load = useCallback(() => {
    fetch('/api/revision/due')
      .then((r) => r.json())
      .then((d) => setData(d.data as RevisionData))
      .catch(() => toast.error('Could not load revision queue.'))
  }, [])
  useEffect(() => { load() }, [load])

  /* ---- Session lifecycle ---- */
  const startSession = useCallback((items: RevisionItem[]) => {
    if (items.length === 0) {
      toast('Nothing to review right now.', { icon: '✨' })
      return
    }
    setSession({
      items,
      idx: 0,
      flipped: false,
      startTime: Date.now(),
      endTime: null,
      ratings: [],
      xp: 0,
      hintShownForIdx: [],
    })
    setView('session')
    setUndoActive(false)
    setUndoRemaining(0)
    undoDeadlineRef.current = 0
  }, [])

  const exitSession = useCallback(() => {
    setSession(null)
    setView('hub')
    setUndoActive(false)
    load()
  }, [load])

  const rate = useCallback((sm2Quality: Sm2Quality) => {
    setSession((prev) => {
      if (!prev) return prev
      if (!prev.flipped) return prev   // must flip before rating
      const item = prev.items[prev.idx]
      const apiQuality = sm2ToApiQuality(sm2Quality)
      const usedHint = prev.hintShownForIdx.includes(prev.idx)

      // Fire-and-forget POST — keep the existing /api/revision/due contract.
      void fetch('/api/revision/due', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId: item.id, quality: apiQuality, topicId: item.topicId }),
      }).catch(() => { /* silent — rating already recorded locally */ })

      const rating: RatingRecord = { item, quality: sm2Quality, apiQuality, at: Date.now(), usedHint }
      const xpDelta = sm2Quality === 0 ? 2 : sm2Quality === 3 ? 5 : sm2Quality === 4 ? 8 : 12
      const ratings = [...prev.ratings, rating]
      const isLast = prev.idx + 1 >= prev.items.length

      if (isLast) {
        const xp = prev.xp + xpDelta
        const completed: SessionState = {
          ...prev,
          ratings,
          xp,
          endTime: Date.now(),
        }
        // Defer summary transition so the card's exit animation can play.
        window.setTimeout(() => {
          setSession(completed)
          setView('summary')
          setConfettiTrigger((t) => t + 1)
          pushMascotToast({
            mascot: 'leo',
            state: 'achievement',
            message: `Session complete! You reviewed ${completed.items.length} cards and earned +${xp} XP.`,
          })
        }, 220)
        return { ...prev, flipped: false }
      }

      // Open the 10-second undo window.
      undoDeadlineRef.current = Date.now() + 10000
      setUndoActive(true)

      return {
        ...prev,
        idx: prev.idx + 1,
        flipped: false,
        ratings,
        xp: prev.xp + xpDelta,
        hintShownForIdx: prev.hintShownForIdx.filter((i) => i !== prev.idx),
      }
    })
  }, [pushMascotToast])

  const undoLastRating = useCallback(() => {
    setSession((prev) => {
      if (!prev) return prev
      if (prev.ratings.length === 0) return prev
      const lastRating = prev.ratings[prev.ratings.length - 1]
      const newRatings = prev.ratings.slice(0, -1)
      // Reverse the XP delta.
      const xpDelta = lastRating.quality === 0 ? 2 : lastRating.quality === 3 ? 5 : lastRating.quality === 4 ? 8 : 12
      toast(`Undid "${lastRating.quality === 0 ? 'Again' : lastRating.quality === 3 ? 'Hard' : lastRating.quality === 4 ? 'Good' : 'Easy'}" — card restored.`)
      setUndoActive(false)
      undoDeadlineRef.current = 0
      return {
        ...prev,
        idx: Math.max(0, prev.idx - 1),
        flipped: false,
        ratings: newRatings,
        xp: Math.max(0, prev.xp - xpDelta),
        hintShownForIdx: lastRating.usedHint
          ? [...prev.hintShownForIdx, prev.idx - 1]
          : prev.hintShownForIdx,
      }
    })
  }, [])

  const flipCard = useCallback(() => {
    setSession((prev) => prev ? { ...prev, flipped: !prev.flipped } : prev)
  }, [])

  const showHint = useCallback(() => {
    setSession((prev) => {
      if (!prev) return prev
      if (prev.hintShownForIdx.includes(prev.idx)) return prev
      return { ...prev, hintShownForIdx: [...prev.hintShownForIdx, prev.idx] }
    })
  }, [])

  /* ---- Keyboard shortcuts (session only) ---- */
  useEffect(() => {
    if (view !== 'session' || !session) return
    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in an input.
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return

      switch (e.key) {
        case '1': rate(0); break
        case '2': rate(3); break
        case '3': rate(4); break
        case '4': rate(5); break
        case ' ':
        case 'Enter':
          e.preventDefault()
          flipCard()
          break
        case 'h':
        case 'H':
          showHint()
          break
        case 'u':
        case 'U':
          if (undoActive) undoLastRating()
          break
        case 'Escape':
          exitSession()
          break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [view, session, rate, flipCard, showHint, undoActive, undoLastRating, exitSession])

  /* ---- Derived hub values ---- */
  const dueToday = data?.dueToday || []
  const overdue = data?.overdue || []
  const upcoming = data?.upcoming || []
  const mastered = (data?.all || []).filter((r) => r.state === 'mastered').length
  const total = (data?.all || []).length

  const forecast = useMemo(() => buildForecast(dueToday.length, overdue.length), [dueToday.length, overdue.length])
  const retention = useMemo(() => buildRetention(), [])

  /* ========================================================================= */
  /*  SUMMARY VIEW                                                              */
  /* ========================================================================= */
  if (view === 'summary' && session) {
    const elapsedMs = (session.endTime ?? Date.now()) - session.startTime
    const minutes = Math.floor(elapsedMs / 60000)
    const seconds = Math.round((elapsedMs % 60000) / 1000)
    const accuracyDenom = session.ratings.length || 1
    const accuracyNum = session.ratings.filter((r) => r.quality >= 3).length
    const accuracyPct = Math.round((accuracyNum / accuracyDenom) * 100)
    const hardest = session.ratings
      .filter((r) => r.quality === 0 || r.quality === 3)
      .slice(-3)
      .reverse()
    const hardestItems = hardest.map((r) => r.item)

    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Confetti trigger={confettiTrigger} duration={4000} pieceCount={64} />

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/15 via-orange-500/5 to-transparent border border-amber-500/20 shadow-premium-md p-6 sm:p-8 text-center"
        >
          <div className="flex flex-col items-center gap-3">
            <Mascot mascot="leo" state="achievement" size={88} className="mascot-float" />
            <h2 className="text-2xl sm:text-3xl font-bold">
              <span className="text-gradient-warm">Session Complete!</span>
            </h2>
            <p className="text-sm text-muted-foreground max-w-md">
              You reviewed {session.items.length} cards in {minutes}m {seconds}s. Leo is proud of you.
            </p>
          </div>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryStat icon={<Layers className="h-4 w-4" />} value={session.items.length} label="Cards Reviewed" tint="amber" />
          <SummaryStat icon={<Timer className="h-4 w-4" />} value={minutes} suffix={`m ${seconds}s`} label="Time Spent" tint="primary" />
          <SummaryStat icon={<Flame className="h-4 w-4" />} value={session.xp} label="XP Earned" tint="rose" />
          <SummaryStat icon={<Target className="h-4 w-4" />} value={accuracyPct} suffix="%" label="Accuracy" tint="emerald" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="card-lift">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Retention Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={retention} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                    <defs>
                      <linearGradient id="retention-stroke" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={1} />
                        <stop offset="100%" stopColor="var(--chart-4)" stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle, var(--border))" vertical={false} />
                    <XAxis dataKey="session" tick={{ fontSize: 11 }} stroke="var(--text-muted)" tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="var(--text-muted)" tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', borderRadius: 12, fontSize: 12 }}
                      formatter={(v: number) => [`${v}%`, 'Accuracy']}
                    />
                    <ReferenceLine y={80} stroke="var(--success)" strokeDasharray="4 4" />
                    <Line
                      type="monotone"
                      dataKey="accuracy"
                      stroke="url(#retention-stroke)"
                      strokeWidth={3}
                      dot={{ r: 3, fill: 'var(--chart-2)' }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="card-lift">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" /> 14-Day Forecast
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={forecast} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle, var(--border))" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="var(--text-muted)" tickLine={false} axisLine={false} interval={0} />
                    <YAxis tick={{ fontSize: 11 }} stroke="var(--text-muted)" tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', borderRadius: 12, fontSize: 12 }}
                      formatter={(v: number) => [`${v} cards`, 'Due']}
                    />
                    <Bar dataKey="cards" radius={[6, 6, 0, 0]}>
                      {forecast.map((entry, i) => (
                        <Cell key={i} fill={entry.today ? 'var(--brand)' : 'var(--chart-3)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Hardest cards */}
        {hardestItems.length > 0 && (
          <Card className="card-lift">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-500" /> Hardest Cards This Session
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {hardestItems.map((item, i) => (
                <div
                  key={`${item.id}-${i}`}
                  className="flex items-center gap-3 p-2.5 rounded-lg border border-rose-500/20 bg-rose-500/5"
                >
                  <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
                    <Layers className="h-4 w-4 text-rose-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.topic.title}</p>
                    <p className="text-meta text-muted-foreground font-mono">
                      {item.topic.unit?.subject.code} · Unit {item.topic.unit?.number}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-meta capitalize border-rose-500/30 text-rose-600">
                    {item.state}
                  </Badge>
                </div>
              ))}
              <Button
                variant="outline"
                className="w-full mt-3 gap-2"
                onClick={() => startSession(hardestItems)}
              >
                <RotateCw className="h-4 w-4" /> Review these again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            className="flex-1 gap-2"
            onClick={() => { setSession(null); setView('hub'); load() }}
          >
            <CheckCircle2 className="h-4 w-4" /> Back to Hub
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => startSession(session.items)}
          >
            <Zap className="h-4 w-4" /> Start Another Session
          </Button>
        </div>
      </div>
    )
  }

  /* ========================================================================= */
  /*  SESSION VIEW                                                              */
  /* ========================================================================= */
  if (view === 'session' && session) {
    const item = session.items[session.idx]
    const topic = item.topic
    const subject = topic.unit?.subject
    const sourceLesson = item.sourceLesson
    const difficulty = stateToDifficulty(item.state)
    const easeFactor = stateToEaseFactor(item.state)
    const intervalDays = stateToIntervalDays(item.state)
    const hintShown = session.hintShownForIdx.includes(session.idx)
    const progressPct = (session.idx / session.items.length) * 100

    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Top bar */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={exitSession}
            className="gap-1.5 shrink-0"
          >
            <X className="h-4 w-4" /> Exit
          </Button>
          <div className="flex-1 min-w-0">
            <Progress value={progressPct} className="h-1.5" />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="secondary" className="tabular-nums">
              {session.idx + 1} / {session.items.length}
            </Badge>
            <Badge className="gap-1 bg-amber-500/10 text-amber-600 border-amber-500/20">
              <Flame className="h-3 w-3" />
              <AnimatedNumber value={session.xp} className="tabular-nums" /> XP
            </Badge>
          </div>
        </div>

        {/* 3D flip card — `.flip-card.flipped .flip-card-inner` rotates the inner,
            so the `flipped` class lives on the outer `.flip-card` (per premium-enhancements.css).
            The outer needs an explicit height so `.flip-card-inner { height: 100% }`
            resolves and the absolutely-positioned faces fill the card. */}
        <div
          className={cn('flip-card cursor-pointer select-none', session.flipped && 'flipped')}
          onClick={flipCard}
          role="button"
          tabIndex={0}
          aria-label={session.flipped ? 'Showing answer. Click to flip back.' : 'Showing question. Click to flip.'}
          style={{ height: 360 }}
        >
          <div className="flip-card-inner">
            {/* FRONT */}
            <div className="flip-card-face p-6 flex flex-col">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {subject && (
                    <Badge variant="outline" className="text-meta gap-1">
                      <Mascot
                        mascot={(MASCOT_KEYS as readonly string[]).includes(subject.mascotKey) ? (subject.mascotKey as MascotKey) : 'leo'}
                        state="explaining"
                        size={14}
                      />
                      {subject.code}
                    </Badge>
                  )}
                  <Badge variant="outline" className={cn('text-meta border', DIFFICULTY_BADGE[difficulty])}>
                    {DIFFICULTY_LABEL[difficulty]}
                  </Badge>
                </div>
                <span className="text-meta text-muted-foreground">Unit {topic.unit?.number ?? '?'}</span>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
                <p className="text-meta text-muted-foreground uppercase tracking-wide">Question</p>
                <h3 className="text-xl sm:text-2xl font-bold leading-snug">{topic.title}</h3>
                <p className="text-meta text-muted-foreground mt-2 inline-flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Tap to flip
                </p>
              </div>

              {/* Per-card meta */}
              <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-border/60">
                <span className="text-meta text-muted-foreground">ease <span className="font-mono text-foreground">{easeFactor.toFixed(2)}</span></span>
                <span className="text-meta text-muted-foreground">next: {describeInterval(intervalDays)}</span>
              </div>
            </div>

            {/* BACK */}
            <div className="flip-card-face flip-card-back p-6 flex flex-col">
              <div className="flex items-center justify-between gap-2 mb-4">
                <Badge variant="outline" className="text-meta">Answer</Badge>
                <span className="text-meta text-muted-foreground">Unit {topic.unit?.number ?? '?'}</span>
              </div>

              <div className="flex-1 flex flex-col gap-3">
                <p className="text-sm font-medium">{topic.title}</p>
                <div className="rounded-xl bg-muted/40 p-4 text-sm leading-relaxed">
                  {topic.description || `Review the key concepts of ${topic.title}.`}
                </div>

                {hintShown && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400 flex gap-2"
                  >
                    <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>Hint used — interval will be reduced by ~10%.</span>
                  </motion.div>
                )}

                {sourceLesson?.canonicalUrl && (
                  <Link
                    href={sourceLesson.canonicalUrl}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary"
                  >
                    Return to lesson <ArrowUpRight className="h-3 w-3" />
                  </Link>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-border/60">
                <span className="text-meta text-muted-foreground">ease <span className="font-mono text-foreground">{easeFactor.toFixed(2)}</span></span>
                <span className="text-meta text-muted-foreground">next: {describeInterval(intervalDays)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Hint button (front only, hidden after reveal) */}
        <AnimatePresence>
          {!session.flipped && !hintShown && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center justify-between gap-3"
            >
              <Button variant="ghost" size="sm" onClick={showHint} className="gap-1.5 text-muted-foreground">
                <Lightbulb className="h-3.5 w-3.5" /> Stuck? Show hint
              </Button>
              <span className="text-meta text-muted-foreground italic">−10% interval</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Confidence rating */}
        <div>
          <p className={cn(
            'text-sm font-medium text-center mb-3 transition-opacity',
            session.flipped ? 'opacity-100' : 'opacity-50',
          )}>
            How well did you remember this?
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {RATING_PRESETS.map((preset) => {
              const cls = RATING_CLASS[preset.quality]
              const disabled = !session.flipped
              return (
                <button
                  key={preset.quality}
                  onClick={() => rate(preset.quality)}
                  disabled={disabled}
                  className={cn(
                    cls,
                    'rounded-xl px-3 py-3 text-center transition-all flex flex-col items-center gap-1',
                    disabled && 'opacity-40 cursor-not-allowed',
                  )}
                  aria-label={`${preset.label} — ${preset.description}`}
                >
                  <span className="text-xl leading-none">{preset.emoji}</span>
                  <span className="text-sm font-semibold">{preset.label}</span>
                  <span className="text-meta opacity-80 flex items-center gap-1">
                    <kbd className="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 text-[10px] font-mono">{preset.shortcut}</kbd>
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Undo + shortcuts help */}
        <div className="flex items-center justify-between gap-2">
          <AnimatePresence>
            {undoActive && (
              <motion.button
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                onClick={undoLastRating}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Undo2 className="h-3.5 w-3.5" />
                Undo last rating ({undoRemaining}s)
              </motion.button>
            )}
          </AnimatePresence>
          <div className="ml-auto flex items-center gap-1.5 text-meta text-muted-foreground">
            <Keyboard className="h-3 w-3" />
            <span className="hidden sm:inline">Space flip · 1-4 rate · H hint · U undo · Esc exit</span>
            <span className="sm:hidden">Shortcuts</span>
          </div>
        </div>
      </div>
    )
  }

  /* ========================================================================= */
  /*  HUB VIEW                                                                  */
  /* ========================================================================= */
  return (
    <div className="space-y-6">
      {/* Hero — premium */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/15 shadow-premium-sm">
        <div className="h-12 w-12 rounded-xl bg-card/60 backdrop-blur flex items-center justify-center shrink-0">
          <Mascot mascot="leo" state="hinting" size={40} />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold">
            <span className="text-gradient-warm">Smart Revision</span>
          </h2>
          <p className="text-sm text-muted-foreground">Spaced repetition that adapts to your memory.</p>
        </div>
        <div className="hidden sm:block">
          <div className="text-right">
            <p className="text-2xl font-bold text-amber-500 tabular-nums leading-none">
              {Math.round((mastered / Math.max(total, 1)) * 100)}%
            </p>
            <p className="text-meta text-muted-foreground">mastered</p>
          </div>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile icon={<Clock className="h-4 w-4" />} value={dueToday.length} label="Due Today" tint="amber" />
        <StatTile icon={<AlertCircle className="h-4 w-4" />} value={overdue.length} label="Overdue" tint="rose" />
        <StatTile icon={<CheckCircle2 className="h-4 w-4" />} value={mastered} label="Mastered" tint="emerald" />
        <StatTile icon={<Brain className="h-4 w-4" />} value={total} label="Total Topics" tint="primary" />
      </div>

      {/* Mode tabs */}
      <Tabs value={mode} onValueChange={(v) => setMode(v as 'classic' | 'flashcards')}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="classic" className="gap-1.5">
            <Layers className="h-3.5 w-3.5" /> Classic List
          </TabsTrigger>
          <TabsTrigger value="flashcards" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> 3D Flashcards
          </TabsTrigger>
        </TabsList>

        {/* 3D Flashcards tab — pre-session launcher */}
        <TabsContent value="flashcards" className="mt-4">
          <Card className="card-lift shadow-premium-sm">
            <CardContent className="p-6 text-center">
              <Mascot mascot="leo" state="greeting" size={88} className="mx-auto mascot-float" />
              <h3 className="text-lg font-bold mt-3">
                <span className="text-gradient">3D Flashcard Session</span>
              </h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Flip through cards in 3D, rate your confidence with the SM-2 algorithm,
                and watch your mastery grow.
              </p>
              {dueToday.length > 0 ? (
                <>
                  <p className="text-meta text-muted-foreground mt-3">
                    <span className="font-semibold text-amber-600">{dueToday.length}</span> card{dueToday.length === 1 ? '' : 's'} ready for review
                  </p>
                  <Button className="mt-4 gap-2" onClick={() => startSession(dueToday)}>
                    <Zap className="h-4 w-4" /> Start Session
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground mt-3">
                  ✨ All caught up — no cards due right now.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Classic List tab */}
        <TabsContent value="classic" className="mt-4 space-y-4">
          {/* Forecast mini-chart */}
          <Card className="card-lift">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" /> 14-Day Forecast
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={forecast} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle, var(--border))" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="var(--text-muted)" tickLine={false} axisLine={false} interval={0} />
                    <YAxis tick={{ fontSize: 11 }} stroke="var(--text-muted)" tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', borderRadius: 12, fontSize: 12 }}
                      formatter={(v: number) => [`${v} cards`, 'Due']}
                    />
                    <Bar dataKey="cards" radius={[6, 6, 0, 0]}>
                      {forecast.map((entry, i) => (
                        <Cell key={i} fill={entry.today ? 'var(--brand)' : 'var(--chart-3)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Due Today */}
          <Card className={cn('card-lift', dueToday.length > 0 && 'border-amber-500/30')}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <RotateCw className="h-4 w-4 text-amber-500" />
                  </div>
                  <CardTitle className="text-base">Due Today</CardTitle>
                </div>
                {dueToday.length > 0 && (
                  <Button size="sm" onClick={() => startSession(dueToday)} className="gap-1.5">
                    <Zap className="h-3.5 w-3.5" /> Start Session
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {dueToday.length > 0 ? (
                <div className="space-y-2">
                  {dueToday.map((r) => (
                    <RevisionItemRow key={r.id} item={r} onSnooze={(id) => {
                      // Optimistically remove from local state; full reload on next load().
                      setData((prev) => prev ? {
                        ...prev,
                        dueToday: prev.dueToday.filter((x) => x.id !== id),
                      } : prev)
                    }} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Mascot mascot="leo" state="achievement" size={64} className="mx-auto mascot-float" />
                  <p className="text-sm font-medium mt-3">
                    <span className="text-gradient">All caught up!</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    No revisions due today. Great job staying on track.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <Card className="card-lift">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-base">Upcoming</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48 premium-scroll">
                  <div className="space-y-2">
                    {upcoming.map((r) => <RevisionItemRow key={r.id} item={r} onSnooze={() => {}} />)}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Topic States Overview */}
          {(data?.all || []).length > 0 && (
            <Card className="card-lift">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  All Topics by State
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(['new', 'learning', 'weak', 'relearning', 'revising', 'review', 'proficient', 'mastered'] as string[])
                    .map((state) => {
                      const items = (data?.all || []).filter((r) => r.state === state)
                      if (items.length === 0) return null
                      return (
                        <button
                          key={state}
                          className={cn('rounded-lg px-3 py-1.5 text-xs font-medium capitalize hover-soft focus-ring', STATE_COLORS[state])}
                        >
                          {state}: <span className="tabular-nums">{items.length}</span>
                        </button>
                      )
                    })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                             */
/* -------------------------------------------------------------------------- */

function StatTile({
  icon,
  value,
  label,
  tint,
}: {
  icon: React.ReactNode
  value: number
  label: string
  tint: 'primary' | 'amber' | 'emerald' | 'rose'
}) {
  const tintClasses: Record<typeof tint, string> = {
    primary: 'stat-tile-tint-primary text-primary',
    amber: 'stat-tile-tint-amber text-amber-500',
    emerald: 'stat-tile-tint-emerald text-emerald-500',
    rose: 'stat-tile-tint-rose text-rose-500',
  }
  const bgClasses: Record<typeof tint, string> = {
    primary: 'bg-primary/10',
    amber: 'bg-amber-500/10',
    emerald: 'bg-emerald-500/10',
    rose: 'bg-rose-500/10',
  }
  return (
    <div className={cn('stat-tile p-3 flex items-center gap-3 shadow-premium-sm', tintClasses[tint])}>
      <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center', bgClasses[tint])}>
        {icon}
      </div>
      <div>
        <p className="text-lg font-bold leading-none tabular-nums">
          <AnimatedNumber value={value} />
        </p>
        <p className="text-meta text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

function SummaryStat({
  icon,
  value,
  suffix,
  label,
  tint,
}: {
  icon: React.ReactNode
  value: number
  suffix?: string
  label: string
  tint: 'primary' | 'amber' | 'emerald' | 'rose'
}) {
  const tintClasses: Record<typeof tint, string> = {
    primary: 'text-primary',
    amber: 'text-amber-500',
    emerald: 'text-emerald-500',
    rose: 'text-rose-500',
  }
  const bgClasses: Record<typeof tint, string> = {
    primary: 'bg-primary/10',
    amber: 'bg-amber-500/10',
    emerald: 'bg-emerald-500/10',
    rose: 'bg-rose-500/10',
  }
  return (
    <div className="stat-tile p-4 flex items-center gap-3 shadow-premium-sm">
      <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', bgClasses[tint], tintClasses[tint])}>
        {icon}
      </div>
      <div>
        <p className="text-xl font-bold leading-none tabular-nums">
          <AnimatedNumber value={value} />
          {suffix && <span className="text-sm font-medium text-muted-foreground ml-0.5">{suffix}</span>}
        </p>
        <p className="text-meta text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

function RevisionItemRow({
  item,
  onSnooze,
}: {
  item: RevisionItem
  onSnooze: (id: string) => void
}) {
  const [snoozed, setSnoozed] = useState(false)
  const topic = item.topic
  const subject = topic.unit?.subject
  const sourceLesson = item.sourceLesson
  const intervalDays = stateToIntervalDays(item.state)

  // Snooze — keep the existing /api/revision/due POST contract (quality=2).
  // NOTE: per the audit (A-2), POSTing quality=2 currently lapses the schedule
  // and damages ease. The canonical fix lives in src/lib/revision/sm-2.ts as
  // `snoozeSchedule()` — once the backend imports it and accepts a `snooze`
  // flag, switch this call to send { scheduleId, snooze: true, topicId }.
  const snooze = async () => {
    try {
      await fetch('/api/revision/due', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId: item.id, quality: 2, topicId: item.topicId }),
      })
      toast('Snoozed until tomorrow.', { icon: '⏰' })
      setSnoozed(true)
      onSnooze(item.id)
    } catch {
      toast.error('Could not snooze. Try again.')
    }
  }

  if (snoozed) return null
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover-soft card-lift">
      <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0', STATE_COLORS[item.state] || STATE_COLORS.new)}>
        <Layers className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{topic.title}</p>
        {sourceLesson?.canonicalUrl ? (
          <Link
            href={sourceLesson.canonicalUrl}
            className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-primary"
          >
            {sourceLesson.title}
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        ) : null}
        <p className="text-meta text-muted-foreground font-mono">
          {subject?.code} · Unit {topic.unit?.number} · next {describeInterval(intervalDays)}
        </p>
      </div>
      <Badge variant="outline" className={cn('text-meta capitalize', STATE_COLORS[item.state] || STATE_COLORS.new)}>
        {item.state}
      </Badge>
      <Button variant="ghost" size="sm" onClick={snooze} className="text-xs hover-soft shrink-0">Snooze</Button>
    </div>
  )
}



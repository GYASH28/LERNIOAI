'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import {
  Book, Pen, Clock, RotateCw, Zap, CheckCircle2, Circle, Trophy, RefreshCw,
  Snowflake, Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Mascot } from '@/components/mascots/mascot'

interface Quest {
  key: string
  label: string
  description: string
  icon: string
  xpReward: number
  current: number
  target: number
  unit: string
  done: boolean
}

interface QuestsData {
  date: string
  quests: Quest[]
  completedCount: number
  totalXp: number
  correctToday: number
  minutesToday: number
  xpToday: number
  dailyGoalMins: number
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  book: Book,
  pen: Pen,
  clock: Clock,
  rotate: RotateCw,
  zap: Zap,
}

export function DailyQuestsCard() {
  const [data, setData] = useState<QuestsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [claimedBonus, setClaimedBonus] = useState<{
    bonusXp: number
    freezesGranted: number
    freezes: number
  } | null>(null)
  // Track whether we've already attempted a claim for the current quest set
  // — prevents re-claiming on every refresh once we've awarded.
  const claimedForDateRef = useRef<string | null>(null)

  const load = useCallback(async () => {
    try {
      setRefreshing(true)
      const res = await fetch('/api/analytics/quests')
      const json = await res.json()
      if (json.ok) setData(json.data)
    } catch {
      /* swallow — widget degrades silently */
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
    // Refresh every 60s so progress stays in sync during long sessions,
    // but skip the fetch when the tab is hidden (avoids wasteful background
    // polling) and catch up immediately on focus.
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

  // Auto-claim the "All Quests Complete" bonus when all 5 quests are done.
  // Idempotent — the API itself de-dupes per (userId, date), but we also
  // guard client-side so we don't spam the endpoint on every refresh.
  useEffect(() => {
    if (!data) return
    if (data.completedCount !== data.quests.length) return
    if (claimedForDateRef.current === data.date) return
    claimedForDateRef.current = data.date
    let cancelled = false
    setClaiming(true)
    fetch('/api/analytics/quests/claim', { method: 'POST' })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return
        if (json.ok && json.data?.awarded) {
          setClaimedBonus({
            bonusXp: json.data.bonusXp,
            freezesGranted: json.data.freezesGranted,
            freezes: json.data.freezes,
          })
          toast.success('Daily Quest Bonus!', {
            description: `+${json.data.bonusXp} XP${
              json.data.freezesGranted > 0 ? ' · +1 Streak Freeze ❄️' : ''
            }`,
            duration: 6000,
          })
          // Refresh to pick up the new XP total
          load()
        }
      })
      .catch(() => {
        /* non-blocking */
      })
      .finally(() => {
        if (!cancelled) setClaiming(false)
      })
    return () => {
      cancelled = true
    }
  }, [data, load])

  if (loading || !data) {
    return (
      <Card className="card-lift">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              Today&rsquo;s Quests
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 rounded-lg shimmer" />
          ))}
        </CardContent>
      </Card>
    )
  }

  const pct = data.quests.length
    ? (data.completedCount / data.quests.length) * 100
    : 0

  return (
    <Card className="card-lift relative overflow-hidden">
      {/* Soft top gradient accent */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-24 pointer-events-none opacity-60"
        style={{
          background:
            'radial-gradient(120% 80% at 0% 0%, color-mix(in oklch, var(--primary) 14%, transparent), transparent 60%), radial-gradient(120% 80% at 100% 0%, color-mix(in oklch, oklch(0.72 0.17 75) 12%, transparent), transparent 60%)',
        }}
      />
      <CardHeader className="pb-3 relative">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            Today&rsquo;s Quests
            <span className="badge-premium ml-1">+{data.totalXp} XP</span>
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            onClick={load}
            disabled={refreshing}
            className="h-7 w-7 p-0"
            aria-label="Refresh quests"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
          </Button>
        </div>
        {/* Overall progress */}
        <div className="space-y-1 mt-1">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>
              {data.completedCount} of {data.quests.length} complete
            </span>
            <span>{Math.round(pct)}%</span>
          </div>
          <Progress value={pct} className="h-1.5" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0 relative">
        {data.quests.map((q, i) => {
          const Icon = ICONS[q.icon] || Zap
          const progress = Math.min(100, (q.current / q.target) * 100)
          return (
            <motion.div
              key={q.key}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.25 }}
              className={cn(
                'group relative flex items-center gap-3 p-2.5 rounded-lg border transition-colors',
                q.done
                  ? 'border-success/30 bg-success/5'
                  : 'border-border hover-soft',
              )}
            >
              <div
                className={cn(
                  'quest-check h-9 w-9 rounded-lg flex items-center justify-center shrink-0 border',
                  q.done
                    ? 'bg-success/15 text-success border-success/30'
                    : 'bg-muted/60 text-muted-foreground border-border',
                )}
                data-done={q.done}
                aria-hidden
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={cn(
                      'text-xs font-medium truncate',
                      q.done && 'text-success line-through decoration-success/40',
                    )}
                  >
                    {q.label}
                  </p>
                  <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 shrink-0">
                    +{q.xpReward}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground truncate">
                  {q.description}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={progress} className="h-1 flex-1" />
                  <span className="text-[10px] tabular-nums text-muted-foreground w-16 text-right">
                    {Math.min(q.current, q.target)}/{q.target} {q.unit}
                  </span>
                </div>
              </div>
              {q.done ? (
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground/50 shrink-0" />
              )}
            </motion.div>
          )
        })}

        {data.completedCount === data.quests.length && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="celebrate-border rounded-lg p-3 relative overflow-hidden"
          >
            {/* Sparkle particles for celebration */}
            <div className="absolute inset-0 pointer-events-none" aria-hidden>
              {[
                { left: '8%', top: '10%', bg: 'oklch(0.72 0.17 75)', dx: '-12px' },
                { left: '30%', top: '20%', bg: 'oklch(0.65 0.22 340)', dx: '6px' },
                { left: '55%', top: '8%', bg: 'oklch(0.62 0.16 155)', dx: '-8px' },
                { left: '78%', top: '18%', bg: 'oklch(0.72 0.17 75)', dx: '10px' },
                { left: '92%', top: '10%', bg: 'oklch(0.65 0.22 340)', dx: '-4px' },
              ].map((p, i) => (
                <span
                  key={i}
                  className="sparkle-particle"
                  style={{
                    left: p.left,
                    top: p.top,
                    background: p.bg,
                    ['--dx' as string]: p.dx,
                  } as React.CSSProperties}
                />
              ))}
            </div>
            <div className="relative flex items-center gap-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.1 }}
                className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-400 to-fuchsia-500 flex items-center justify-center shrink-0"
              >
                <Trophy className="h-5 w-5 text-white" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gradient-warm">All quests complete!</p>
                <p className="text-[10px] text-muted-foreground">
                  {claimedBonus
                    ? `+${claimedBonus.bonusXp} bonus XP earned${
                        claimedBonus.freezesGranted > 0
                          ? ` · ${claimedBonus.freezes}/5 streak freezes`
                          : ''
                      }`
                    : claiming
                      ? 'Claiming your bonus…'
                      : 'Come back tomorrow for fresh ones.'}
                </p>
              </div>
              {claimedBonus?.freezesGranted !== undefined && claimedBonus.freezesGranted > 0 && (
                <motion.div
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.3 }}
                  className="freeze-chip h-7 px-2 rounded-full flex items-center gap-1 text-[10px] font-semibold"
                >
                  <Snowflake className="h-3 w-3" />
                  +1
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  )
}

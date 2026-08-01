'use client'

/**
 * StreakFreezeWidget
 * ------------------
 * Renders the user's streak-freeze status in two forms:
 *   - `compact`: a small frosty pill for the Dashboard topbar (display-only).
 *   - `full`:    a larger card for the Profile view, with a "Use Freeze Now"
 *                button that consumes a freeze (POST /api/user/freeze) when the
 *                streak is broken.
 *
 * Fetches GET /api/user/freeze on mount + every 60s. Degrades gracefully on
 * error (renders muted text) and never throws into the parent view.
 */

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Snowflake, Flame } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { usePrefs } from '@/components/theme-provider'
import { cn } from '@/lib/utils'

/** Shape returned by GET /api/user/freeze (see route.ts). */
export interface FreezeStatus {
  freezes: number
  maxFreezes: number
  lastActiveDate: string | null
  lastFreezeUsedDate: string | null
  streak: number
  streakBroken: boolean
  canUseFreeze: boolean
  alreadyUsedToday: boolean
}

interface Props {
  variant?: 'compact' | 'full'
  /** Called after a freeze is successfully consumed (full variant only). */
  onUsed?: () => void
}

export function StreakFreezeWidget({ variant = 'full', onUsed }: Props) {
  const { pref } = usePrefs()
  // Framer Motion animations are skipped when the user has requested reduced
  // motion or low-power mode (mirrors the mascot / learn view pattern).
  const animateMotion = !pref.reducedMotion && !pref.lowPower

  const [status, setStatus] = useState<FreezeStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [using, setUsing] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/user/freeze', { cache: 'no-store' })
      const json = await res.json()
      if (json.ok) {
        setStatus(json.data)
        setError(false)
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
    load()
    // Refresh every 60s, skipping while the tab is hidden and catching up
    // on focus (avoids wasteful background polling).
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

  const useFreeze = useCallback(async () => {
    if (using) return
    setUsing(true)
    try {
      const res = await fetch('/api/user/freeze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'use' }),
      })
      const json = await res.json()
      if (json.ok && json.data.used) {
        toast.success('Streak protected! ❄️', {
          description: '+15 XP for keeping your streak alive.',
        })
        onUsed?.()
        // Refresh state from the server (POST returns the new freeze count,
        // but re-fetching GET keeps the rest of the status fields in sync).
        await load()
      } else if (json.ok) {
        const reason = json.data.reason
        if (reason === 'already_used_today') {
          toast.info('Freeze already used today — come back tomorrow.')
        } else if (reason === 'no_freezes') {
          toast.error('No freezes left — complete all 5 daily quests to earn one!')
        } else if (reason === 'streak_not_broken') {
          toast.info('Your streak is still active — no freeze needed.')
        }
        await load()
      } else {
        const msg = json.error?.message || 'Couldn’t use freeze right now.'
        // Server-returned ApiError codes are surfaced as friendly toasts.
        const code = json.error?.code
        if (code === 'NO_FREEZES') {
          toast.error('No freezes left — complete all 5 daily quests to earn one!')
        } else if (code === 'STREAK_NOT_BROKEN') {
          toast.info('Your streak is still active — no freeze needed.')
        } else {
          toast.error(msg)
        }
      }
    } catch {
      toast.error('Network error — please try again.')
    } finally {
      setUsing(false)
    }
  }, [using, load, onUsed])

  // ---------------------------------------------------------------------------
  // COMPACT (Dashboard pill)
  // ---------------------------------------------------------------------------
  if (variant === 'compact') {
    if (loading) {
      return (
        <div
          className="freeze-chip h-8 w-16 rounded-lg skeleton-premium"
          role="status"
          aria-label="Loading streak freeze status"
        />
      )
    }
    if (error || !status) {
      // Compact never crashes the parent — render an empty frosted chip so the
      // topbar layout stays stable.
      return (
        <div
          className="freeze-chip h-8 px-2.5 rounded-lg flex items-center gap-1 text-[11px] text-muted-foreground"
          role="status"
          aria-label="Streak freeze status unavailable"
        >
          <Snowflake className="h-3.5 w-3.5" />
          <span>—</span>
        </div>
      )
    }
    const tip = `Streak Freezes: ${status.freezes} of ${status.maxFreezes} — complete all daily quests to earn more`
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="freeze-chip h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-[11px] font-semibold tabular-nums cursor-default select-none"
            role="status"
            aria-label={tip}
          >
            <Snowflake className="h-3.5 w-3.5" />
            <span>
              {status.freezes}
              <span className="opacity-60">/{status.maxFreezes}</span>
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">{tip}</TooltipContent>
      </Tooltip>
    )
  }

  // ---------------------------------------------------------------------------
  // FULL (Profile card)
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <Card className="card-lift">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Snowflake className="h-4 w-4 text-cyan-500" />
            Streak Freeze
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-4 w-3/4 rounded skeleton-premium" />
          <div className="flex gap-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-6 w-6 rounded skeleton-premium" />
            ))}
          </div>
          <div className="h-8 w-full rounded skeleton-premium" />
        </CardContent>
      </Card>
    )
  }

  if (error || !status) {
    return (
      <Card className="card-lift">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Snowflake className="h-4 w-4 text-cyan-500" />
            Streak Freeze
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Couldn’t load freeze status.
          </p>
        </CardContent>
      </Card>
    )
  }

  const lastUsedLabel = status.lastFreezeUsedDate
    ? formatDate(status.lastFreezeUsedDate)
    : null

  return (
    <Card className="card-lift relative overflow-hidden">
      {/* Frosted top accent */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-20 pointer-events-none opacity-60"
        style={{
          background:
            'radial-gradient(120% 80% at 0% 0%, color-mix(in oklch, oklch(0.72 0.13 220) 18%, transparent), transparent 60%), radial-gradient(120% 80% at 100% 0%, color-mix(in oklch, oklch(0.62 0.10 195) 14%, transparent), transparent 60%)',
        }}
      />
      <CardHeader className="pb-3 relative">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Snowflake className="h-4 w-4 text-cyan-500" />
            Streak Freeze
          </CardTitle>
          <span className="text-xs font-semibold tabular-nums text-cyan-600 dark:text-cyan-300">
            {status.freezes}{' '}
            <span className="opacity-60">/ {status.maxFreezes}</span>
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 relative">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Earn 1 freeze by completing all 5 daily quests. Use a freeze to
          protect your streak when you miss a day.
        </p>

        {/* Row of 5 snowflake icons — filled (cyan) for earned, muted for empty.
            A `key` on the container tied to `freezes` forces a remount so the
            staggered bounce-in replays whenever the count changes. */}
        <motion.div
          key={`freeze-row-${status.freezes}`}
          className="flex items-center justify-between gap-1.5"
          initial={animateMotion ? 'hidden' : false}
          animate="show"
          variants={{
            hidden: { opacity: 1 },
            show: {
              opacity: 1,
              transition: { staggerChildren: 0.06 },
            },
          }}
        >
          {Array.from({ length: status.maxFreezes }).map((_, i) => {
            const earned = i < status.freezes
            return (
              <motion.span
                key={i}
                variants={
                  animateMotion
                    ? {
                        hidden: { scale: 0.4, opacity: 0 },
                        show: {
                          scale: 1,
                          opacity: 1,
                          transition: {
                            type: 'spring',
                            stiffness: 380,
                            damping: 18,
                          },
                        },
                      }
                    : undefined
                }
                className={cn(
                  'h-9 w-9 rounded-lg flex items-center justify-center border transition-colors',
                  earned
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-500 dark:text-cyan-300'
                    : 'bg-muted/40 border-border text-muted-foreground/40',
                )}
                aria-label={earned ? 'Freeze earned' : 'Empty freeze slot'}
              >
                <Snowflake className="h-4 w-4" />
              </motion.span>
            )
          })}
        </motion.div>

        {/* Status section — drives the primary action / messaging. */}
        <StatusSection
          status={status}
          using={using}
          onUse={useFreeze}
        />

        {/* Footer: last-used date */}
        <p className="text-[10px] text-muted-foreground/80 pt-1 border-t border-border/60">
          {lastUsedLabel
            ? `Last used: ${lastUsedLabel}`
            : 'Never used'}
        </p>
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Sub-components                                                             */
/* -------------------------------------------------------------------------- */

function StatusSection({
  status,
  using,
  onUse,
}: {
  status: FreezeStatus
  using: boolean
  onUse: () => void
}) {
  if (!status.streakBroken) {
    return (
      <Badge
        variant="outline"
        className="bg-success/10 text-success border-success/30 gap-1.5 bounce-in"
      >
        <Flame className="h-3.5 w-3.5" />
        Streak active — {status.streak} days 🔥
      </Badge>
    )
  }

  if (status.alreadyUsedToday) {
    return (
      <p className="text-xs text-muted-foreground">
        Freeze already used today — come back tomorrow.
      </p>
    )
  }

  if (status.canUseFreeze) {
    return (
      <div className="bounce-in">
        <Button
          onClick={onUse}
          disabled={using}
          className="w-full gap-2"
          size="sm"
          data-cursor={using ? "hourglass" : undefined}
        >
          <Snowflake className="h-4 w-4" />
          {using ? 'Using…' : 'Use Freeze Now'}
        </Button>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
          Protects your {status.streak}-day streak by bridging yesterday.
        </p>
      </div>
    )
  }

  // streakBroken && !canUseFreeze && !alreadyUsedToday ⇒ no freezes left.
  return (
    <p className="text-xs text-muted-foreground">
      Streak broken — complete all daily quests to earn a freeze.
    </p>
  )
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatDate(yyyymmdd: string): string {
  // The API returns YYYY-MM-DD. Parse as a local date (not UTC) so the day
  // shown matches what the user expects.
  const [y, m, d] = yyyymmdd.split('-').map(Number)
  if (!y || !m || !d) return yyyymmdd
  const date = new Date(y, m - 1, d)
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date)
  } catch {
    return yyyymmdd
  }
}

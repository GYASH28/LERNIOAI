'use client'

/**
 * AchievementUnlockToaster — global listener that polls
 * `/api/achievements/new` and fires celebratory toasts when achievements
 * are unlocked server-side (e.g. by a focus session ending, a streak-freeze
 * use, or a daily-quest claim — events that happen on other views).
 *
 * The component renders nothing visible by default — it is purely a
 * polling listener that fires toasts via the existing `sonner` library.
 * Mount it once near the app root (e.g. next to `<Toaster />`).
 *
 * Polling strategy:
 *  - On mount: GET with `since` = (now - 30s) — catches unlocks that
 *    happened just before the toaster loaded.
 *  - Every 15s: GET with `since` = last `serverTime` received.
 *  - Stops the interval while `document.hidden`, resumes on
 *    `visibilitychange` (with an immediate catch-up poll).
 *  - `since` is kept in a ref so the poller never re-subscribes on re-render.
 *
 * Dedup:
 *  - Each newly-earned UserAchievement ID is tracked in a `Set` (ref).
 *  - The entry is cleared when the toast is dismissed (auto or via "View")
 *    OR after a 60s safety-net timeout — whichever comes first.
 */

import { useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { toast } from 'sonner'
import {
  Sparkles,
  Award,
  Footprints,
  Flame,
  Trophy,
  Star,
  Crown,
  Snowflake,
  Timer,
  Code2,
  Brain,
  Repeat,
  Target,
  Crosshair,
  Medal,
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  BookOpen,
  Hourglass,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type LucideIconType = React.ComponentType<{ className?: string }>

type Category =
  | 'learning'
  | 'practice'
  | 'revision'
  | 'coding'
  | 'consistency'
  | 'contribution'

interface AchievementDTO {
  id: string
  key: string
  name: string
  description: string
  icon: string
  category: string
  xpReward: number
}

interface NewlyEarnedDTO {
  id: string
  achievementId: string
  earnedAt: string
  achievement: AchievementDTO
}

interface NewAchievementsResponse {
  ok: boolean
  data?: {
    newlyEarned: NewlyEarnedDTO[]
    serverTime: string
  }
}

/* ------------------------------------------------------------------ */
/* Icon map — mirrors AchievementWall; falls back to Award.            */
/* ------------------------------------------------------------------ */

const ICON_MAP: Record<string, LucideIconType> = {
  Footprints,
  Flame,
  Trophy,
  Star,
  Crown,
  Snowflake,
  Timer,
  Code2,
  Brain,
  Repeat,
  Target,
  Crosshair,
  Medal,
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  BookOpen,
  Hourglass,
  Clock,
  Award,
}

const FALLBACK_ICON: LucideIconType = Award

/* ------------------------------------------------------------------ */
/* Category color mapping                                              */
/* ------------------------------------------------------------------ */

const CATEGORY_GRADIENTS: Record<Category, string> = {
  learning: 'from-emerald-400 to-emerald-600',
  practice: 'from-violet-400 to-violet-600',
  revision: 'from-amber-400 to-amber-600',
  coding: 'from-cyan-400 to-cyan-600',
  consistency: 'from-rose-400 to-rose-600',
  contribution: 'from-blue-400 to-blue-600',
}

const FALLBACK_GRADIENT = CATEGORY_GRADIENTS.learning

function getCategoryGradient(category: string): string {
  return CATEGORY_GRADIENTS[category as Category] ?? FALLBACK_GRADIENT
}

/* ------------------------------------------------------------------ */
/* Toast content                                                       */
/* ------------------------------------------------------------------ */

interface ToastContentProps {
  earned: NewlyEarnedDTO
  reduced: boolean
  onDismiss: () => void
}

/**
 * The rich React component rendered inside the toast. Passed to
 * `toast.custom()` so we have full control over layout & styling
 * (the existing `.celebrate-border` gradient border, the amber→fuchsia
 * background overlay, the 360px width, and the Framer Motion entrance).
 */
function AchievementToastContent({
  earned,
  reduced,
  onDismiss,
}: ToastContentProps) {
  const achievement = earned.achievement
  const Icon = ICON_MAP[achievement.icon] ?? FALLBACK_ICON
  const iconGradient = getCategoryGradient(achievement.category)

  // Bounce-in from bottom-right. Sonner slides the <li> wrapper in from
  // bottom-right on its own; this spring adds the celebratory bounce
  // (scale + small translate). Disabled when the user prefers reduced
  // motion.
  const initial = reduced ? false : { opacity: 0, y: 14, x: 14, scale: 0.82 }
  const animate = { opacity: 1, y: 0, x: 0, scale: 1 }
  const transition = reduced
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 360, damping: 15, mass: 0.9 }

  return (
    <motion.div
      initial={initial}
      animate={animate}
      transition={transition}
      role="alert"
      aria-live="assertive"
      aria-label={`Achievement unlocked: ${achievement.name}. ${achievement.description}. Plus ${achievement.xpReward} XP.`}
      className={cn(
        'celebrate-border relative flex w-[360px] max-w-[90vw] items-start gap-3 rounded-xl p-4',
        'shadow-[0_10px_40px_-8px_rgba(0,0,0,0.35)]',
      )}
    >
      {/* Amber→fuchsia gradient overlay (10%) over the card background.
          The `.celebrate-border` class fills the padding-box with
          `var(--card)`; this overlay tints it with the warm gradient. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-amber-500/10 to-fuchsia-500/10"
      />

      {/* Subtle inner glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-xl shadow-[inset_0_0_24px_-6px_rgba(245,158,11,0.25)]"
      />

      {/* Category-colored icon — 40×40 rounded-full, gradient bg */}
      <div
        className={cn(
          'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-white',
          iconGradient,
        )}
      >
        <Icon className="h-5 w-5" />
      </div>

      {/* Content column */}
      <div className="relative min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          <p className="text-[11px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
            Achievement Unlocked!
          </p>
        </div>
        <p className="mt-0.5 truncate text-sm font-bold leading-tight">
          {achievement.name}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground">
          {achievement.description}
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className={cn(
            'mt-2 inline-flex h-7 items-center rounded-md border border-border bg-background/80 px-3 text-xs font-medium',
            'transition-colors hover:bg-background',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
          )}
        >
          View
        </button>
      </div>

      {/* +N XP pill — top-right (in-flow as last flex child, top-aligned) */}
      <span
        className={cn(
          'relative shrink-0 rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5',
          'text-[11px] font-bold tabular-nums text-amber-700 dark:text-amber-300',
        )}
      >
        +{achievement.xpReward} XP
      </span>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Main component — global polling listener                            */
/* ------------------------------------------------------------------ */

const POLL_INTERVAL_MS = 15_000
const INITIAL_LOOKBACK_MS = 30_000
const TOAST_DURATION_MS = 6_000
const SHOWN_TTL_MS = 60_000 // safety-net cleanup for the dedup Set

export function AchievementUnlockToaster() {
  const reduced = useReducedMotion()
  // Keep the latest `reduced` value in a ref so the polling effect never
  // needs to re-subscribe when the preference changes.
  const reducedRef = useRef(reduced)
  reducedRef.current = reduced

  // Latest `since` timestamp — kept in a ref so the poller always uses the
  // most recent serverTime without re-subscribing the interval on every
  // render. Lazy-initialised on first read (now − 30s) to catch unlocks
  // that happened just before mount.
  const sinceRef = useRef<string>('')
  if (sinceRef.current === '') {
    sinceRef.current = new Date(Date.now() - INITIAL_LOOKBACK_MS).toISOString()
  }

  // Dedup set of shown UserAchievement IDs — prevents double-toasting when
  // two polls arrive while a toast is still on screen.
  const shownRef = useRef<Set<string>>(new Set())
  // Safety-net timers — clear a dedup entry after 60s even if the toast's
  // onDismiss never fires (e.g. the user navigates away mid-toast).
  const shownTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  )

  useEffect(() => {
    let cancelled = false
    let interval: ReturnType<typeof setInterval> | null = null

    // Capture the ref values inside the effect so the cleanup function
    // reads stable references (and to satisfy react-hooks/exhaustive-deps).
    const shown = shownRef.current
    const shownTimers = shownTimersRef.current

    const markShown = (id: string) => {
      shown.add(id)
      const prev = shownTimers.get(id)
      if (prev) clearTimeout(prev)
      const t = setTimeout(() => {
        shown.delete(id)
        shownTimers.delete(id)
      }, SHOWN_TTL_MS)
      shownTimers.set(id, t)
    }

    const clearShown = (id: string) => {
      shown.delete(id)
      const prev = shownTimers.get(id)
      if (prev) {
        clearTimeout(prev)
        shownTimers.delete(id)
      }
    }

    const showToast = (earned: NewlyEarnedDTO) => {
      if (shown.has(earned.id)) return
      markShown(earned.id)
      toast.custom(
        (t) => (
          <AchievementToastContent
            earned={earned}
            reduced={Boolean(reducedRef.current)}
            onDismiss={() => toast.dismiss(t)}
          />
        ),
        {
          duration: TOAST_DURATION_MS,
          onDismiss: () => clearShown(earned.id),
        },
      )
    }

    const poll = async () => {
      // Belt-and-suspenders: never poll while the tab is hidden.
      if (typeof document !== 'undefined' && document.hidden) return
      try {
        const url = `/api/achievements/new?since=${encodeURIComponent(sinceRef.current)}`
        const res = await fetch(url, { cache: 'no-store' })
        if (!res.ok) return
        const json = (await res.json()) as NewAchievementsResponse
        if (cancelled) return
        if (!json.ok || !json.data) return
        // Advance the cursor BEFORE firing toasts so a quick re-poll can't
        // re-fetch the same rows.
        sinceRef.current = json.data.serverTime
        for (const earned of json.data.newlyEarned) {
          showToast(earned)
        }
      } catch {
        /* swallow — non-blocking; will retry next interval */
      }
    }

    const startInterval = () => {
      if (interval) return
      interval = setInterval(() => {
        void poll()
      }, POLL_INTERVAL_MS)
    }

    const stopInterval = () => {
      if (interval) {
        clearInterval(interval)
        interval = null
      }
    }

    const onVisibility = () => {
      if (document.hidden) {
        stopInterval()
      } else {
        // Resume — immediately catch up on anything missed while hidden,
        // then restart the cadence.
        void poll()
        startInterval()
      }
    }

    // Initial mount poll.
    void poll()
    startInterval()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      stopInterval()
      document.removeEventListener('visibilitychange', onVisibility)
      // Clear all safety-net timers.
      shownTimers.forEach((t) => clearTimeout(t))
      shownTimers.clear()
    }
  }, [])

  // The component renders nothing visible — it is just a polling listener.
  return null
}

export default AchievementUnlockToaster

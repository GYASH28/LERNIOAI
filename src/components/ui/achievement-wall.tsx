'use client'

/**
 * AchievementWall — premium achievement showcase.
 *
 * Two variants:
 *  - `compact` (Dashboard): horizontal scrollable row of the top 8 earned
 *    badges followed by the 4 next-locked ones. Each tile is a 56×56 rounded
 *    square with a hover tooltip (name + description + status).
 *  - `full` (Profile): category filter pills + 4-column responsive grid of
 *    every achievement (earned first by earnedAt desc, then locked by name),
 *    plus a stat strip ("X / Y earned · Z% complete") with a thin progress
 *    bar above the grid.
 *
 * Visual polish:
 *  - Earned: full-color gradient ring per category + soft glow + XP badge in
 *    the corner.
 *  - Locked: grayscale + opacity-50 + small lock icon overlay.
 *  - Framer Motion staggered entrance + hover lift, disabled when the user
 *    prefers reduced motion.
 *
 * The component is fully self-contained — it fetches `GET /api/achievements`
 * and manages its own loading / error / empty / retry states.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Award,
  Footprints,
  Flame,
  Trophy,
  Code2,
  Star,
  Sparkles,
  Crown,
  Snowflake,
  Timer,
  Hourglass,
  Clock,
  Brain,
  Repeat,
  Target,
  Crosshair,
  Medal,
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  BookOpen,
  Lock,
  RefreshCw,
  AlertCircle,
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
  earned: boolean
}

interface EarnedDTO {
  id: string
  userId: string
  achievementId: string
  earnedAt: string
  achievement: AchievementDTO
}

interface AchievementsData {
  achievements: AchievementDTO[]
  earned: EarnedDTO[]
}

export interface AchievementWallProps {
  /** Compact = Dashboard row; full = Profile grid. Defaults to `compact`. */
  variant?: 'compact' | 'full'
  className?: string
}

/* ------------------------------------------------------------------ */
/* Icon map — falls back to `Award` when the API returns an unknown   */
/* icon name (e.g. if a new achievement is added before this list is  */
/* updated).                                                           */
/* ------------------------------------------------------------------ */

const ICON_MAP: Record<string, LucideIconType> = {
  Footprints,
  Flame,
  Trophy,
  Code2,
  Star,
  Sparkles,
  Crown,
  Snowflake,
  Timer,
  Hourglass,
  Clock,
  Brain,
  Repeat,
  Target,
  Crosshair,
  Medal,
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  BookOpen,
  Award,
}

/* The fallback icon used when the API returns an unknown icon name. */
const FALLBACK_ICON: LucideIconType = Award

/* ------------------------------------------------------------------ */
/* Category color mapping                                              */
/* ------------------------------------------------------------------ */

interface CategoryStyle {
  /** Tailwind gradient stops for the earned ring background. */
  ring: string
  /** Soft box-shadow glow (per category hue). */
  glow: string
  /** Solid category text colour (for filter dots / accents). */
  text: string
  /** Filter pill + chip classes (low-opacity tint + matching border). */
  chip: string
  /** XP badge corner pill classes. */
  badge: string
}

const CATEGORY_STYLES: Record<Category, CategoryStyle> = {
  learning: {
    ring: 'from-emerald-400 to-emerald-600',
    glow: 'shadow-[0_0_22px_-6px_oklch(0.65_0.16_155_/_0.55)]',
    text: 'text-emerald-500',
    chip: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  },
  practice: {
    ring: 'from-violet-400 to-violet-600',
    glow: 'shadow-[0_0_22px_-6px_oklch(0.65_0.2_300_/_0.55)]',
    text: 'text-violet-500',
    chip: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30',
    badge: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30',
  },
  revision: {
    ring: 'from-amber-400 to-amber-600',
    glow: 'shadow-[0_0_22px_-6px_oklch(0.72_0.17_75_/_0.55)]',
    text: 'text-amber-500',
    chip: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
    badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  },
  coding: {
    ring: 'from-cyan-400 to-cyan-600',
    glow: 'shadow-[0_0_22px_-6px_oklch(0.7_0.15_200_/_0.55)]',
    text: 'text-cyan-500',
    chip: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
    badge: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
  },
  consistency: {
    ring: 'from-rose-400 to-rose-600',
    glow: 'shadow-[0_0_22px_-6px_oklch(0.65_0.22_25_/_0.55)]',
    text: 'text-rose-500',
    chip: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
    badge: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
  },
  contribution: {
    ring: 'from-blue-400 to-blue-600',
    glow: 'shadow-[0_0_22px_-6px_oklch(0.62_0.18_250_/_0.55)]',
    text: 'text-blue-500',
    chip: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
    badge: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
  },
}

const FALLBACK_STYLE: CategoryStyle = CATEGORY_STYLES.learning

function getStyle(category: string): CategoryStyle {
  return CATEGORY_STYLES[category as Category] ?? FALLBACK_STYLE
}

const FILTERS: { key: Category | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'learning', label: 'Learning' },
  { key: 'practice', label: 'Practice' },
  { key: 'revision', label: 'Revision' },
  { key: 'coding', label: 'Coding' },
  { key: 'consistency', label: 'Consistency' },
  { key: 'contribution', label: 'Contribution' },
]

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(iso))
  } catch {
    return 'recently'
  }
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

interface TileProps {
  achievement: AchievementDTO
  earnedAt?: string
  index: number
  reduced: boolean
  size: 'compact' | 'full'
}

/** A single badge tile used by both variants. Renders its own Tooltip. */
function AchievementTile({ achievement, earnedAt, index, reduced, size }: TileProps) {
  const Icon = ICON_MAP[achievement.icon] ?? FALLBACK_ICON
  const style = getStyle(achievement.category)
  const earned = achievement.earned

  const initial = reduced ? false : { opacity: 0, y: 8, scale: 0.94 }
  const animate = { opacity: 1, y: 0, scale: 1 }
  const transition = reduced
    ? { duration: 0 }
    : { delay: Math.min(index * 0.04, 0.4), duration: 0.32, ease: 'easeOut' as const }
  const whileHover = reduced ? undefined : { y: -3, scale: 1.06 }

  const isCompact = size === 'compact'

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          initial={initial}
          animate={animate}
          transition={transition}
          whileHover={whileHover}
          tabIndex={0}
          role="group"
          aria-label={`${achievement.name}: ${achievement.description}${
            earned ? ` — earned ${earnedAt ? formatDate(earnedAt) : ''}` : ' — locked'
          }`}
          className={cn(
            'relative shrink-0 cursor-default outline-none focus-visible:ring-2 focus-visible:ring-ring/60 rounded-xl',
            isCompact ? 'h-14 w-14' : 'w-full',
          )}
        >
          <div
            className={cn(
              'relative flex items-center justify-center border',
              isCompact
                ? 'h-14 w-14 rounded-xl'
                : 'h-20 w-20 rounded-2xl mx-auto',
              earned
                ? cn('bg-gradient-to-br text-white border-white/20', style.ring, style.glow)
                : 'bg-muted/60 text-muted-foreground border-dashed border-border opacity-50 grayscale',
            )}
          >
            <Icon className={isCompact ? 'h-6 w-6' : 'h-9 w-9'} />

            {/* XP badge in the corner — only for earned tiles */}
            {earned && (
              <span
                className={cn(
                  'absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full text-[9px] font-bold border tabular-nums',
                  isCompact
                    ? 'h-5 min-w-5 px-1'
                    : 'h-6 min-w-6 px-1 text-[10px]',
                  style.badge,
                )}
              >
                +{achievement.xpReward}
              </span>
            )}

            {/* Small lock overlay — only for locked tiles */}
            {!earned && (
              <span
                className={cn(
                  'absolute -bottom-1 -right-1 flex items-center justify-center rounded-full bg-background border border-border',
                  isCompact ? 'h-4 w-4' : 'h-5 w-5',
                )}
              >
                <Lock className={isCompact ? 'h-2.5 w-2.5 text-muted-foreground' : 'h-3 w-3 text-muted-foreground'} />
              </span>
            )}
          </div>

          {/* Full variant: name + description + footer below the icon */}
          {!isCompact && (
            <div className="mt-2.5 text-center">
              <p className="text-xs font-semibold leading-tight line-clamp-1">
                {achievement.name}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground leading-snug line-clamp-2 min-h-[2.4em]">
                {achievement.description}
              </p>
              <p className="mt-1.5 text-[9px] text-muted-foreground/80">
                {earned && earnedAt
                  ? `Earned ${formatDate(earnedAt)}`
                  : `Locked · ${achievement.xpReward} XP reward`}
              </p>
            </div>
          )}
        </motion.div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px] text-left">
        <div className="font-semibold leading-tight">{achievement.name}</div>
        <div className="mt-0.5 text-[10px] opacity-90 leading-snug">{achievement.description}</div>
        <div className="mt-1 text-[10px] opacity-75">
          {earned && earnedAt
            ? `Earned ${formatDate(earnedAt)} · +${achievement.xpReward} XP`
            : `Locked · +${achievement.xpReward} XP reward`}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

/** Skeleton placeholder tile (uses the premium shimmer class from globals.css). */
function SkeletonTile({ size }: { size: 'compact' | 'full' }) {
  if (size === 'compact') {
    return <div className="h-14 w-14 rounded-xl skeleton-premium shrink-0" />
  }
  return (
    <div className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-border/50">
      <div className="h-20 w-20 rounded-2xl skeleton-premium" />
      <div className="h-3 w-16 rounded skeleton-premium" />
      <div className="h-2 w-20 rounded skeleton-premium" />
    </div>
  )
}

/** Friendly mascot message shown when no achievements have been earned yet. */
function EmptyState({ compact }: { compact: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <div className="h-14 w-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
        <Footprints className="h-7 w-7 text-amber-500" />
      </div>
      <p className={cn('text-muted-foreground max-w-xs', compact ? 'text-xs' : 'text-sm')}>
        Achievements unlock as you learn. Complete your first lesson to earn{' '}
        <span className="font-semibold text-foreground">&lsquo;First Step&rsquo;</span>!
      </p>
    </div>
  )
}

/** Error state with a retry button. */
function ErrorState({ onRetry, refreshing }: { onRetry: () => void; refreshing: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <AlertCircle className="h-8 w-8 text-muted-foreground/60" />
      <p className="text-sm text-muted-foreground">Couldn&rsquo;t load achievements.</p>
      <Button size="sm" variant="outline" onClick={onRetry} disabled={refreshing}>
        <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
        Tap to retry
      </Button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export function AchievementWall({ variant = 'compact', className }: AchievementWallProps) {
  const prefersReduced = useReducedMotion()
  const reduced = prefersReduced === true

  const [data, setData] = useState<AchievementsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [errored, setErrored] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [activeFilter, setActiveFilter] = useState<Category | 'all'>('all')

  const load = useCallback(async () => {
    setRefreshing(true)
    setErrored(false)
    try {
      const res = await fetch('/api/achievements', { cache: 'no-store' })
      const json = (await res.json()) as { ok: boolean; data?: AchievementsData }
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
  }, [])

  useEffect(() => {
    load()
  }, [load])

  /* Map of achievementId -> earnedAt (for "Earned {date}" footers / tooltips). */
  const earnedAtMap = useMemo(() => {
    const m = new Map<string, string>()
    if (data?.earned) {
      for (const e of data.earned) m.set(e.achievementId, e.earnedAt)
    }
    return m
  }, [data])

  /* Earned achievements, preserving the earnedAt-desc order from the API. */
  const earnedAchievements = useMemo<AchievementDTO[]>(() => {
    if (!data) return []
    return data.earned.map((e) => e.achievement)
  }, [data])

  /* Locked achievements, sorted alphabetically by name for stable display. */
  const lockedAchievements = useMemo<AchievementDTO[]>(() => {
    if (!data) return []
    return data.achievements
      .filter((a) => !a.earned)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [data])

  /* Total XP earned from badges — used by the compact header. */
  const totalXp = useMemo(() => {
    if (!data) return 0
    let sum = 0
    for (const e of data.earned) sum += e.achievement.xpReward
    return sum
  }, [data])

  /* Full-variant filtered + sorted list:
     earned first (earnedAt desc — already in that order from the API),
     then locked (by name). Category filter applies on top. */
  const fullList = useMemo<AchievementDTO[]>(() => {
    if (!data) return []
    const earnedSlice = earnedAchievements.filter(
      (a) => activeFilter === 'all' || a.category === activeFilter,
    )
    const lockedSlice = lockedAchievements.filter(
      (a) => activeFilter === 'all' || a.category === activeFilter,
    )
    return [...earnedSlice, ...lockedSlice]
  }, [data, earnedAchievements, lockedAchievements, activeFilter])

  const earnedCount = data?.earned.length ?? 0
  const totalCount = data?.achievements.length ?? 0
  const pct = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0
  const isEmpty = earnedCount === 0

  /* ---------------------------------------------------------------- */
  /* Loading state                                                    */
  /* ---------------------------------------------------------------- */
  if (loading && !data) {
    return (
      <Card className={cn('card-lift', className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              Achievements
            </CardTitle>
            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground/40 animate-spin" />
          </div>
        </CardHeader>
        <CardContent>
          {variant === 'compact' ? (
            <div className="flex gap-3 overflow-hidden pb-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonTile key={i} size="compact" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonTile key={i} size="full" />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  /* ---------------------------------------------------------------- */
  /* Error state (no cached data)                                     */
  /* ---------------------------------------------------------------- */
  if (errored && !data) {
    return (
      <Card className={cn('card-lift', className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorState onRetry={load} refreshing={refreshing} />
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  /* ---------------------------------------------------------------- */
  /* Refresh button (shared by both variants)                         */
  /* ---------------------------------------------------------------- */
  const refreshButton = (
    <Button
      size="sm"
      variant="ghost"
      onClick={load}
      disabled={refreshing}
      className="h-7 w-7 p-0 shrink-0"
      aria-label="Refresh achievements"
    >
      <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
    </Button>
  )

  /* ---------------------------------------------------------------- */
  /* Compact variant — Dashboard                                      */
  /* ---------------------------------------------------------------- */
  if (variant === 'compact') {
    const topEarned = earnedAchievements.slice(0, 8)
    const nextLocked = lockedAchievements.slice(0, 4)

    return (
      <Card className={cn('card-lift', className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              Achievements
            </CardTitle>
            {refreshButton}
          </div>
          <p className="text-[11px] text-muted-foreground leading-tight">
            <span className="font-semibold text-foreground tabular-nums">{earnedCount}</span>
            <span className="opacity-70"> of </span>
            <span className="font-semibold text-foreground tabular-nums">{totalCount}</span>
            <span className="opacity-70"> achievements · </span>
            <span className="text-gradient-warm font-semibold tabular-nums">
              {totalXp} XP
            </span>
            <span className="opacity-70"> earned from badges</span>
          </p>
        </CardHeader>
        <CardContent>
          {isEmpty ? (
            <div className="space-y-3">
              <EmptyState compact />
              {nextLocked.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-1.5">
                    Coming up
                  </p>
                  <div className="flex gap-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:transparent">
                    {nextLocked.map((a, i) => (
                      <AchievementTile
                        key={a.id}
                        achievement={a}
                        index={i}
                        reduced={reduced}
                        size="compact"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:transparent">
              {topEarned.map((a, i) => (
                <AchievementTile
                  key={a.id}
                  achievement={a}
                  earnedAt={earnedAtMap.get(a.id)}
                  index={i}
                  reduced={reduced}
                  size="compact"
                />
              ))}

              {nextLocked.length > 0 && (
                <>
                  <div
                    aria-hidden
                    className="flex flex-col items-center justify-center shrink-0 px-1 self-center"
                  >
                    <div className="h-8 w-px bg-border" />
                    <span className="mt-1 text-[8px] uppercase tracking-wider text-muted-foreground/70">
                      Next
                    </span>
                  </div>
                  {nextLocked.map((a, i) => (
                    <AchievementTile
                      key={a.id}
                      achievement={a}
                      index={8 + i}
                      reduced={reduced}
                      size="compact"
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  /* ---------------------------------------------------------------- */
  /* Full variant — Profile                                           */
  /* ---------------------------------------------------------------- */
  return (
    <Card className={cn('card-lift', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-amber-500/10 flex items-center justify-center">
              <Trophy className="h-4 w-4 text-amber-500" />
            </div>
            Achievement Wall
          </CardTitle>
          {refreshButton}
        </div>

        {/* Stat strip with thin progress bar */}
        <div className="mt-1 space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium">
              <span className="tabular-nums">{earnedCount}</span>
              <span className="text-muted-foreground"> / </span>
              <span className="tabular-nums">{totalCount}</span>
              <span className="text-muted-foreground"> earned</span>
            </span>
            <Badge variant="secondary" className="gap-1 tabular-nums">
              <Star className="h-3 w-3 text-amber-500" />
              {pct}% complete
            </Badge>
          </div>
          <Progress value={pct} className="h-1.5" />
        </div>

        {/* Category filter pills */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {FILTERS.map((f) => {
            const isActive = activeFilter === f.key
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setActiveFilter(f.key)}
                aria-pressed={isActive}
                className={cn(
                  'mode-chip h-7 px-3 text-xs rounded-full border font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-transparent text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground',
                  f.key !== 'all' && !isActive && getStyle(f.key as Category).chip,
                )}
              >
                {f.key !== 'all' && (
                  <span
                    aria-hidden
                    className={cn(
                      'inline-block h-1.5 w-1.5 rounded-full mr-1.5 align-middle',
                      isActive
                        ? 'bg-primary-foreground'
                        : cn(getStyle(f.key as Category).text, 'bg-current'),
                    )}
                  />
                )}
                {f.label}
              </button>
            )
          })}
        </div>
      </CardHeader>

      <CardContent>
        {isEmpty && (
          <div className="mb-4">
            <EmptyState compact={false} />
          </div>
        )}

        {fullList.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No achievements in this category yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {fullList.map((a, i) => (
              <AchievementTile
                key={a.id}
                achievement={a}
                earnedAt={earnedAtMap.get(a.id)}
                index={i}
                reduced={reduced}
                size="full"
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default AchievementWall

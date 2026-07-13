'use client'

/**
 * PremiumAchievementWall — richer replacement for `AchievementWall`.
 *
 * Differences vs the legacy wall:
 *  - Pure presentational component (takes `achievements` + `newlyUnlockedId`
 *    as props) so the dashboard owns the data flow.
 *  - Filter tabs: All / Unlocked / In Progress / Locked.
 *  - Stats header with completion-percentage ring (SVG, animated via framer-motion).
 *  - Per-card rarity colour border (common=muted, rare=info, epic=brand,
 *    legendary=warning) + soft glow.
 *  - Locked cards show a lock overlay + progress bar.
 *  - Click → detail dialog with full description + Share button (sonner toast).
 *  - When `newlyUnlockedId` changes to a new non-null value, fires a confetti
 *    burst (re-using `@/components/ui/confetti`) + sonner toast.
 *
 * Visual contract:
 *  - Cards use `.shadow-premium-sm`.
 *  - Colours reference semantic tokens (`var(--brand)`, `var(--info)`,
 *    `var(--warning)`, `var(--muted)`, `var(--success)`) so the same markup
 *    works across every palette + light/dark appearance.
 *
 * Accessibility:
 *  - Cards are real `<button>`s (keyboard focusable, Enter/Space to open dialog).
 *  - Completion ring has `role="img"` + aria-label.
 *  - Dialog uses shadcn `Dialog*` (Radix-based, focus-trapped).
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Confetti } from '@/components/ui/confetti'
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
  Share2,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type LucideIconType = React.ComponentType<{ className?: string }>
type Rarity = 'common' | 'rare' | 'epic' | 'legendary'
type FilterKey = 'all' | 'unlocked' | 'progress' | 'locked'

export interface PremiumAchievement {
  id: string
  title: string
  description: string
  icon?: string // lucide icon name
  rarity?: Rarity
  unlockedAt?: string | null
  progress?: number
  target?: number
}

export interface PremiumAchievementWallProps {
  achievements: PremiumAchievement[]
  /** When this changes to a new non-null value, fires confetti + toast. */
  newlyUnlockedId?: string | null
  className?: string
}

/* ------------------------------------------------------------------ */
/* Icon map — falls back to `Award` for unknown icon names            */
/* ------------------------------------------------------------------ */

const ICON_MAP: Record<string, LucideIconType> = {
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
  Zap,
}

const FALLBACK_ICON: LucideIconType = Award

function getIcon(name?: string): LucideIconType {
  if (!name) return FALLBACK_ICON
  return ICON_MAP[name] || FALLBACK_ICON
}

/* ------------------------------------------------------------------ */
/* Rarity styles                                                       */
/* ------------------------------------------------------------------ */

interface RarityStyle {
  border: string
  glow: string
  chip: string
  ring: string
  gradient: string
}

const RARITY_STYLES: Record<Rarity, RarityStyle> = {
  common: {
    border: 'border-border',
    glow: 'shadow-premium-sm',
    chip: 'bg-muted/60 text-muted-foreground border-border',
    ring: 'var(--muted)',
    gradient: 'from-emerald-400 to-teal-500',
  },
  rare: {
    border: 'border-info/40',
    glow: 'shadow-[0_0_22px_-6px_oklch(0.62_0.18_250_/_0.45)]',
    chip: 'bg-info/10 text-info border-info/30',
    ring: 'var(--info)',
    gradient: 'from-sky-400 to-blue-500',
  },
  epic: {
    border: 'border-primary/40',
    glow: 'shadow-[0_0_24px_-6px_oklch(var(--brand)/0.50)]',
    chip: 'bg-primary/10 text-primary border-primary/30',
    ring: 'var(--brand)',
    gradient: 'from-violet-400 to-fuchsia-500',
  },
  legendary: {
    border: 'border-warning/50',
    glow: 'shadow-[0_0_28px_-6px_oklch(0.72_0.17_75_/_0.55)]',
    chip: 'bg-warning/10 text-warning border-warning/40',
    ring: 'var(--warning)',
    gradient: 'from-amber-400 to-orange-500',
  },
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function timeAgo(date?: string | null): string | null {
  if (!date) return null
  const diff = Date.now() - new Date(date).getTime()
  if (Number.isNaN(diff)) return null
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function isUnlocked(a: PremiumAchievement): boolean {
  return !!a.unlockedAt
}

function isInProgress(a: PremiumAchievement): boolean {
  if (isUnlocked(a)) return false
  const target = a.target ?? 1
  const progress = a.progress ?? 0
  return progress > 0 && progress < target
}

function isLocked(a: PremiumAchievement): boolean {
  return !isUnlocked(a) && !isInProgress(a)
}

/* ------------------------------------------------------------------ */
/* Completion ring (animated SVG)                                      */
/* ------------------------------------------------------------------ */

function CompletionRing({ pct, size = 44 }: { pct: number; size?: number }) {
  const clamped = Math.max(0, Math.min(100, pct))
  const r = 15.915
  const stroke = 3
  return (
    <svg
      viewBox="0 0 36 36"
      width={size}
      height={size}
      role="img"
      aria-label={`${Math.round(clamped)}% of achievements unlocked`}
      className="text-foreground shrink-0"
    >
      <circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        stroke="var(--muted)"
        strokeWidth={stroke}
        opacity="0.45"
      />
      <motion.circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        stroke="var(--brand)"
        strokeWidth={stroke}
        strokeLinecap="round"
        transform="rotate(-90 18 18)"
        initial={{ strokeDasharray: '0 100' }}
        animate={{ strokeDasharray: `${clamped} 100` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
      <text
        x="18"
        y="21"
        textAnchor="middle"
        fontSize="9"
        fontWeight="700"
        fill="currentColor"
      >
        {Math.round(clamped)}%
      </text>
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export function PremiumAchievementWall({
  achievements,
  newlyUnlockedId,
  className,
}: PremiumAchievementWallProps) {
  const reduce = useReducedMotion()
  const [filter, setFilter] = useState<FilterKey>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [confettiTrigger, setConfettiTrigger] = useState(0)
  // I-4: last-seen unlock lives in a ref so updating it does NOT trigger a
  // re-render (avoids the cascading-render lint warning that fires when
  // setState is called synchronously inside an effect).
  const lastSeenUnlockRef = useRef<string | null>(null)

  // Celebration: when newlyUnlockedId changes to a new non-null value,
  // fire confetti + sonner toast. The ref-guard means we only fire once
  // per unique id even if the parent re-renders.
  useEffect(() => {
    if (!newlyUnlockedId) return
    if (lastSeenUnlockRef.current === newlyUnlockedId) return
    lastSeenUnlockRef.current = newlyUnlockedId
    const ach = achievements.find((a) => a.id === newlyUnlockedId)
    if (!ach) return
    setConfettiTrigger((t) => t + 1)
    toast.success('Achievement unlocked!', {
      description: `${ach.title} — ${ach.description}`,
      duration: 5000,
    })
  }, [newlyUnlockedId, achievements])

  const unlocked = useMemo(() => achievements.filter(isUnlocked), [achievements])
  const inProgress = useMemo(() => achievements.filter(isInProgress), [achievements])
  const locked = useMemo(() => achievements.filter(isLocked), [achievements])

  const completionPct =
    achievements.length === 0
      ? 0
      : (unlocked.length / achievements.length) * 100

  const filtered = useMemo(() => {
    switch (filter) {
      case 'unlocked':
        return unlocked
      case 'progress':
        return inProgress
      case 'locked':
        return locked
      default:
        return achievements
    }
  }, [filter, achievements, unlocked, inProgress, locked])

  const selected = selectedId
    ? achievements.find((a) => a.id === selectedId) ?? null
    : null

  function handleShare(id: string) {
    const ach = achievements.find((a) => a.id === id)
    if (!ach) return
    // Best-effort Web Share API; fall back silently (toast confirms either way).
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      navigator
        .share({ title: ach.title, text: ach.description })
        .catch(() => {
          /* user dismissed — non-blocking */
        })
    }
    toast.success('Shared!', {
      description: `${ach.title} is ready to share`,
      duration: 2500,
    })
  }

  return (
    <Card className={cn('shadow-premium-sm overflow-hidden', className)}>
      <Confetti trigger={confettiTrigger} pieceCount={36} duration={2500} />

      {/* Stats header */}
      <div className="flex items-center justify-between gap-3 p-4 pb-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            Achievements
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
            {unlocked.length} of {achievements.length} unlocked
          </p>
        </div>
        <CompletionRing pct={completionPct} />
      </div>

      {/* Filter tabs */}
      <div className="px-4 pb-2">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
          <TabsList className="h-8">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="unlocked" className="text-xs">Unlocked</TabsTrigger>
            <TabsTrigger value="progress" className="text-xs">In Progress</TabsTrigger>
            <TabsTrigger value="locked" className="text-xs">Locked</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Grid */}
      <div className="p-4 pt-2">
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">
            No achievements in this category yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {filtered.map((ach, i) => {
              const Icon = getIcon(ach.icon)
              const rarity: Rarity = ach.rarity || 'common'
              const style = RARITY_STYLES[rarity]
              const unlockedNow = isUnlocked(ach)
              const target = ach.target ?? 1
              const progress = Math.min(ach.progress ?? 0, target)
              const pct = target > 0 ? (progress / target) * 100 : 0
              const ago = timeAgo(ach.unlockedAt)
              return (
                <motion.button
                  key={ach.id}
                  type="button"
                  onClick={() => setSelectedId(ach.id)}
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.25 }}
                  whileHover={reduce ? undefined : { y: -2 }}
                  whileTap={reduce ? undefined : { y: 0 }}
                  aria-label={`${ach.title} — ${unlockedNow ? 'unlocked' : 'locked'}. Open details.`}
                  className={cn(
                    'group relative text-left rounded-xl border bg-card p-3 transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    style.border,
                    style.glow,
                    !unlockedNow && 'opacity-90',
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div
                      className={cn(
                        'h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105',
                        unlockedNow
                          ? cn('bg-gradient-to-br text-white', style.gradient)
                          : 'bg-muted/60',
                      )}
                    >
                      {unlockedNow ? (
                        <Icon className="h-4 w-4" />
                      ) : (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{ach.title}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                        {ach.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <Badge
                      variant="outline"
                      className={cn('text-[9px] uppercase tracking-wider h-4 px-1.5 capitalize', style.chip)}
                    >
                      {rarity}
                    </Badge>
                    {unlockedNow ? (
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {ago}
                      </span>
                    ) : (
                      <span className="text-[10px] tabular-nums text-muted-foreground">
                        {progress}/{target}
                      </span>
                    )}
                  </div>

                  {!unlockedNow && (
                    <Progress value={pct} className="h-1 mt-1.5" />
                  )}
                </motion.button>
              )
            })}
          </div>
        )}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'h-12 w-12 rounded-xl flex items-center justify-center shrink-0',
                  selected?.unlockedAt
                    ? cn('bg-gradient-to-br text-white', RARITY_STYLES[selected.rarity || 'common'].gradient)
                    : 'bg-muted/60',
                )}
              >
                {selected &&
                  (selected.unlockedAt ? (
                    (() => {
                      const Icon = getIcon(selected.icon)
                      return <Icon className="h-6 w-6" />
                    })()
                  ) : (
                    <Lock className="h-6 w-6 text-muted-foreground" />
                  ))}
              </div>
              <div className="min-w-0">
                <DialogTitle className="truncate">{selected?.title}</DialogTitle>
                <DialogDescription className="mt-0.5">
                  {selected?.description}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Rarity</span>
              <Badge
                variant="outline"
                className={cn('capitalize', RARITY_STYLES[selected?.rarity || 'common'].chip)}
              >
                {selected?.rarity || 'common'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              {selected?.unlockedAt ? (
                <Badge className="bg-success/15 text-success border-success/30">
                  Unlocked {timeAgo(selected.unlockedAt) ?? 'recently'}
                </Badge>
              ) : (
                <Badge variant="outline">Locked</Badge>
              )}
            </div>
            {selected && !selected.unlockedAt && typeof selected.target === 'number' && (
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Progress</span>
                  <span className="tabular-nums">
                    {selected.progress ?? 0}/{selected.target}
                  </span>
                </div>
                <Progress
                  value={((selected.progress ?? 0) / Math.max(1, selected.target)) * 100}
                  className="h-1.5"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => selected && handleShare(selected.id)}
              className="gap-1.5"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </Button>
            <Button size="sm" onClick={() => setSelectedId(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export default PremiumAchievementWall

'use client'

/**
 * PremiumDailyQuests — richer replacement for `DailyQuestsCard`.
 *
 * Differences vs the legacy card:
 *  - Pure presentational component (takes `quests` + `onClaim` as props) so
 *    the dashboard owns the data flow.
 *  - Live "Resets in HH:MM:SS" countdown to local midnight (1s tick).
 *  - Each quest has an XP chip + Claim button (visible when progress >= target).
 *    Claiming fires confetti + sonner "+{xp} XP earned!" + calls `onClaim(id)`.
 *  - Completed state: checkmark + "Completed" + faded.
 *  - Staggered entrance (50ms per quest).
 *  - Empty state: friendly mascot + helper copy.
 *
 * Visual contract:
 *  - Quest cards use `.shadow-premium-xs`.
 *  - Colours reference semantic tokens (`var(--success)`, `var(--warning)`,
 *    `var(--muted)`) so the same markup works across every palette.
 */

import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Confetti } from '@/components/ui/confetti'
import { Mascot } from '@/components/mascots/mascot'
import {
  Trophy,
  Zap,
  Clock,
  Book,
  Pen,
  RotateCw,
  CheckCircle2,
  Gift,
  Sparkles,
  Target,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type LucideIconType = React.ComponentType<{ className?: string }>

export interface PremiumQuest {
  id: string
  title: string
  description: string
  icon?: string // lucide icon name
  xp: number
  progress: number
  target: number
  claimed?: boolean
}

export interface PremiumDailyQuestsProps {
  quests: PremiumQuest[]
  onClaim?: (questId: string) => void
  className?: string
}

/* ------------------------------------------------------------------ */
/* Icon map — matches the keys returned by /api/analytics/quests       */
/* ------------------------------------------------------------------ */

const ICON_MAP: Record<string, LucideIconType> = {
  book: Book,
  pen: Pen,
  clock: Clock,
  rotate: RotateCw,
  zap: Zap,
  trophy: Trophy,
  gift: Gift,
  sparkles: Sparkles,
  target: Target,
}

const FALLBACK_ICON: LucideIconType = Zap

function getIcon(name?: string): LucideIconType {
  if (!name) return FALLBACK_ICON
  return ICON_MAP[name] || FALLBACK_ICON
}

/* ------------------------------------------------------------------ */
/* Midnight countdown hook                                             */
/* ------------------------------------------------------------------ */

function useMidnightCountdown(): number {
  const [remaining, setRemaining] = useState<number>(0)

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const midnight = new Date(now)
      midnight.setHours(24, 0, 0, 0)
      setRemaining(midnight.getTime() - now.getTime())
    }
    tick()
    const t = window.setInterval(tick, 1000)
    return () => window.clearInterval(t)
  }, [])

  return remaining
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export function PremiumDailyQuests({
  quests,
  onClaim,
  className,
}: PremiumDailyQuestsProps) {
  const reduce = useReducedMotion()
  const remaining = useMidnightCountdown()
  const [confettiTrigger, setConfettiTrigger] = useState(0)
  const [claimedLocal, setClaimedLocal] = useState<Set<string>>(new Set())

  const handleClaim = (quest: PremiumQuest) => {
    if (claimedLocal.has(quest.id) || quest.claimed) return
    setClaimedLocal((prev) => {
      const next = new Set(prev)
      next.add(quest.id)
      return next
    })
    setConfettiTrigger((t) => t + 1)
    toast.success(`+${quest.xp} XP earned!`, {
      description: quest.title,
      duration: 4000,
    })
    onClaim?.(quest.id)
  }

  const completedCount = useMemo(
    () => quests.filter((q) => q.claimed || claimedLocal.has(q.id)).length,
    [quests, claimedLocal],
  )
  const totalXp = useMemo(
    () => quests.reduce((sum, q) => sum + (q.xp || 0), 0),
    [quests],
  )
  const overallPct =
    quests.length === 0 ? 0 : (completedCount / quests.length) * 100

  return (
    <Card className={cn('shadow-premium-xs relative overflow-hidden', className)}>
      <Confetti trigger={confettiTrigger} pieceCount={28} duration={2200} />

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            Daily Quests
            {quests.length > 0 && (
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                {completedCount}/{quests.length}
              </Badge>
            )}
          </CardTitle>
          <div
            className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums"
            aria-label={`Resets in ${formatCountdown(remaining)}`}
          >
            <Clock className="h-3 w-3" />
            Resets in {formatCountdown(remaining)}
          </div>
        </div>

        {quests.length > 0 && (
          <div className="space-y-1 mt-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>
                {completedCount} of {quests.length} complete
              </span>
              <span className="text-amber-600 dark:text-amber-400">+{totalXp} XP available</span>
            </div>
            <Progress value={overallPct} className="h-1" />
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-2 pt-0">
        {quests.length === 0 ? (
          <div className="flex flex-col items-center text-center py-6">
            <Mascot mascot="leo" state="idle" size={64} animated={false} />
            <p className="text-sm font-medium mt-2">No quests yet</p>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-[220px]">
              Check back tomorrow for fresh quests and more XP to earn!
            </p>
          </div>
        ) : (
          quests.map((q, i) => {
            const Icon = getIcon(q.icon)
            const isClaimed = q.claimed || claimedLocal.has(q.id)
            const isComplete = q.progress >= q.target
            const pct =
              q.target > 0 ? Math.min(100, (q.progress / q.target) * 100) : 0
            return (
              <motion.div
                key={q.id}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.5), duration: 0.25 }}
                className={cn(
                  'group relative flex items-center gap-3 p-2.5 rounded-lg border transition-colors shadow-premium-xs',
                  isClaimed
                    ? 'border-success/30 bg-success/5 opacity-70'
                    : isComplete
                      ? 'border-amber-500/30 bg-amber-500/5'
                      : 'border-border hover-soft',
                )}
              >
                <div
                  className={cn(
                    'h-9 w-9 rounded-lg flex items-center justify-center shrink-0 border',
                    isClaimed
                      ? 'bg-success/15 text-success border-success/30'
                      : isComplete
                        ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                        : 'bg-muted/60 text-muted-foreground border-border',
                  )}
                >
                  {isClaimed ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={cn(
                        'text-xs font-medium truncate',
                        isClaimed && 'text-success line-through decoration-success/40',
                      )}
                    >
                      {q.title}
                    </p>
                    <Badge
                      variant="outline"
                      className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/30 shrink-0"
                    >
                      +{q.xp} XP
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {q.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={pct} className="h-1 flex-1" />
                    <span className="text-[10px] tabular-nums text-muted-foreground w-14 text-right">
                      {Math.min(q.progress, q.target)}/{q.target}
                    </span>
                  </div>
                </div>

                {isClaimed ? (
                  <span className="text-[10px] font-semibold text-success shrink-0">
                    Completed
                  </span>
                ) : isComplete ? (
                  <Button
                    size="sm"
                    type="button"
                    onClick={() => handleClaim(q)}
                    className="h-7 px-2 text-[11px] gap-1 shrink-0"
                  >
                    <Gift className="h-3 w-3" />
                    Claim {q.xp} XP
                  </Button>
                ) : null}
              </motion.div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

export default PremiumDailyQuests

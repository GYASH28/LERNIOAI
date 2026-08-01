'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import { LearningIllustration, type LearningIllustrationVariant } from '@/components/engagement/learning-illustration'
import { studyCoachLine } from '@/lib/engagement-copy'

interface EmptyStateProps {
  icon?: ReactNode
  emoji?: string
  title: string
  description?: string
  action?: { label: string; href?: string; onClick?: () => void }
  className?: string
  illustration?: LearningIllustrationVariant
  showCoachLine?: boolean
}

const DEFAULT_EMOJIS = {
  'no-streak': { emoji: '🦉', title: 'Start learning to wake your streak!', desc: 'Study today to begin your streak.', illustration: 'journey' as const },
  'no-announcements': { emoji: '📢', title: 'No announcements yet', desc: 'Important class updates will appear here.', illustration: 'empty' as const },
  'no-classmates': { emoji: '👋', title: 'Waiting for classmates to join', desc: 'Share your class code with friends.', illustration: 'empty' as const },
  'no-attendance': { emoji: '📋', title: 'No attendance taken yet', desc: 'Attendance records will appear after the first session.', illustration: 'planner' as const },
  'no-notifications': { emoji: '☕', title: "You're all caught up", desc: 'There is nothing new requiring your attention.', illustration: 'celebration' as const },
  'no-analytics': { emoji: '🔍', title: 'Study a little to unlock useful insights', desc: 'Analytics become meaningful after real learning activity.', illustration: 'journey' as const },
  'no-practice': { emoji: '✏️', title: 'Ready for your first practice set?', desc: 'Start with a short session and use mistakes as your revision list.', illustration: 'practice' as const },
  'no-exams': { emoji: '🕐', title: 'No exams scheduled yet', desc: 'Your exam plan will appear when dates are available.', illustration: 'planner' as const },
  'no-leaderboard': { emoji: '🏆', title: 'The leaderboard is waiting for its first result', desc: 'Earn XP through completed learning work.', illustration: 'celebration' as const },
  'no-materials': { emoji: '📚', title: 'No matching materials', desc: 'Try another lesson, subject code or search term.', illustration: 'empty' as const },
  'no-coding': { emoji: '🤖', title: 'Your Coding Lab is ready', desc: 'Choose a language or open a coding lesson to begin.', illustration: 'coding' as const },
  'no-labs': { emoji: '🧪', title: 'Choose an experiment to start', desc: 'Interactive simulations appear here when available.', illustration: 'practice' as const },
  'no-revision': { emoji: '🧠', title: 'Nothing is due for revision', desc: 'Complete lessons or create flashcards to build your recall queue.', illustration: 'revision' as const },
  'no-planner': { emoji: '📅', title: 'Your week has no study blocks yet', desc: 'Add a small realistic task instead of planning the entire universe.', illustration: 'planner' as const },
  'no-polls': { emoji: '📊', title: 'No polls yet', desc: 'Class polls will appear here when someone creates one.', illustration: 'empty' as const },
  'no-messages': { emoji: '💬', title: 'No messages yet', desc: 'Start a useful conversation when you have something to discuss.', illustration: 'tutor' as const },
}

export function EmptyState({
  icon,
  emoji,
  title,
  description,
  action,
  className = '',
  illustration = 'empty',
  showCoachLine = true,
}: EmptyStateProps) {
  const displayEmoji = emoji || '✨'
  const displayTitle = title || 'Nothing here yet'
  const displayDesc = description || ''
  const coach = studyCoachLine(displayTitle.length)

  return (
    <div className={`mx-auto flex max-w-2xl flex-col items-center justify-center px-4 py-10 text-center ${className}`}>
      <div className="relative w-full max-w-[300px]">
        <LearningIllustration variant={illustration} animated className="w-full" />
        {icon || emoji ? (
          <div className="absolute bottom-5 right-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-background text-2xl shadow-sm">
            {icon || <span>{displayEmoji}</span>}
          </div>
        ) : null}
      </div>

      <h3 className="mt-1 text-xl font-black tracking-tight text-foreground">{displayTitle}</h3>
      {displayDesc && <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{displayDesc}</p>}

      {showCoachLine && (
        <p className="mt-4 max-w-md rounded-xl bg-muted/60 px-3 py-2 text-xs font-semibold leading-5 text-foreground/75">
          {coach.joke || coach.message}
        </p>
      )}

      {action?.href ? (
        <Link href={action.href} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground transition hover:-translate-y-0.5">
          {action.label}<ArrowRight className="h-4 w-4" />
        </Link>
      ) : action ? (
        <button onClick={action.onClick} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground transition hover:-translate-y-0.5 active:translate-y-0">
          {action.label}<ArrowRight className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  )
}

export function EmptyStatePreset({
  type,
  action,
}: {
  type: keyof typeof DEFAULT_EMOJIS
  action?: { label: string; href?: string; onClick?: () => void }
}) {
  const config = DEFAULT_EMOJIS[type]
  return (
    <EmptyState
      emoji={config.emoji}
      title={config.title}
      description={config.desc}
      action={action}
      illustration={config.illustration}
    />
  )
}

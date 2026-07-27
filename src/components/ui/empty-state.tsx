'use client'

import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  emoji?: string
  title: string
  description?: string
  action?: { label: string; href?: string; onClick?: () => void }
  className?: string
}

const DEFAULT_EMOJIS: Record<string, { emoji: string; title: string; desc: string }> = {
  'no-streak': { emoji: '🦉', title: 'Start learning to wake your streak!', desc: 'Study today to begin your streak.' },
  'no-announcements': { emoji: '📢', title: 'No announcements yet', desc: 'CR, post the first one!' },
  'no-classmates': { emoji: '👋', title: 'Waiting for classmates to join...', desc: 'Share your class code with friends.' },
  'no-attendance': { emoji: '📋', title: 'No attendance taken yet', desc: 'Take attendance to see records here.' },
  'no-notifications': { emoji: '☕', title: "You're all caught up!", desc: 'No new notifications right now.' },
  'no-analytics': { emoji: '🔍', title: 'Start studying to see insights', desc: 'Your analytics will appear here.' },
  'no-practice': { emoji: '✏️', title: 'Ready to practice?', desc: 'Start a practice session to improve.' },
  'no-exams': { emoji: '🕐', title: 'No exams scheduled yet', desc: 'Check back later for exam dates.' },
  'no-leaderboard': { emoji: '🏆', title: 'Be the first to earn XP!', desc: 'Start learning to climb the ranks.' },
  'no-materials': { emoji: '📚', title: 'Materials coming soon', desc: 'Notes and resources will appear here.' },
  'no-coding': { emoji: '🤖', title: 'Write your first line of code!', desc: 'Pick a language and start coding.' },
  'no-labs': { emoji: '🧪', title: 'Pick an experiment to start', desc: 'Interactive simulations await.' },
  'no-revision': { emoji: '🧠', title: 'Create flashcards to revise', desc: 'Your revision cards will appear here.' },
  'no-planner': { emoji: '📅', title: 'Plan your study schedule', desc: 'Add tasks to get started.' },
  'no-polls': { emoji: '📊', title: 'No polls yet', desc: 'Create one to get your class voting.' },
  'no-messages': { emoji: '💬', title: 'No messages yet', desc: 'Start a conversation!' },
}

export function EmptyState({
  icon,
  emoji,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  const displayEmoji = emoji || '✨'
  const displayTitle = title || 'Nothing here yet'
  const displayDesc = description || ''

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      {/* Large emoji with bounce-in animation */}
      <div
        className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted/50 text-4xl"
        style={{ animation: 'countUp 0.5s ease-out' }}
      >
        {icon || <span>{displayEmoji}</span>}
      </div>

      {/* Title */}
      <h3 className="text-base font-bold text-foreground">{displayTitle}</h3>

      {/* Description */}
      {displayDesc && (
        <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">{displayDesc}</p>
      )}

      {/* Action button */}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105 active:scale-95"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

/**
 * Pre-configured empty states for common scenarios.
 * Usage: <EmptyStatePreset type="no-announcements" />
 */
export function EmptyStatePreset({
  type,
  action,
}: {
  type: keyof typeof DEFAULT_EMOJIS
  action?: { label: string; href?: string; onClick?: () => void }
}) {
  const config = DEFAULT_EMOJIS[type]
  return <EmptyState emoji={config.emoji} title={config.title} description={config.desc} action={action} />
}

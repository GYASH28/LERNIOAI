/**
 * SM-2 Spaced Repetition Algorithm — single canonical implementation.
 *
 * Before this module, LERNIO had three drifted SM-2 copies:
 *   - /api/revision/due POST handler
 *   - /api/revision/flashcards POST handler
 *   - predictNextInterval() in flashcard-player.tsx
 *
 * The same "Good" rating yielded different intervals across copies.
 * This module is the single source of truth. All handlers/components
 * must import from here.
 *
 * Quality scale (standard SM-2):
 *   0 = complete blackout
 *   1 = incorrect, but correct answer felt familiar
 *   2 = incorrect, but easy to recall after seeing answer
 *   3 = correct, but with serious difficulty
 *   4 = correct, with some hesitation
 *   5 = perfect, instant recall
 *
 * For the UI we expose 4 buttons: Again(0), Hard(3), Good(4), Easy(5).
 */

export type Sm2Quality = 0 | 1 | 2 | 3 | 4 | 5

export type Sm2Status = 'new' | 'learning' | 'review' | 'relearning' | 'mastered'

export interface Sm2Schedule {
  easeFactor: number      // starts at 2.5, floor 1.3
  interval: number        // days
  repetitions: number     // consecutive correct
  nextDueDate: number     // epoch ms
  lastReviewed: number | null
  lapses: number          // times lapsed (quality < 3)
  status: Sm2Status
}

/** Create a fresh schedule for a new card. */
export function createSchedule(now: number = Date.now()): Sm2Schedule {
  return {
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextDueDate: now,
    lastReviewed: null,
    lapses: 0,
    status: 'new',
  }
}

/**
 * Advance an SM-2 schedule given a quality rating (0-5).
 * Pure function — does not mutate input.
 */
export function advanceSm2(schedule: Sm2Schedule, quality: Sm2Quality, now: number = Date.now()): Sm2Schedule {
  let { easeFactor, interval, repetitions, lapses, status } = schedule

  // Step 1: Adjust ease factor per SuperMemo formula
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  if (easeFactor < 1.3) easeFactor = 1.3

  // Step 2: Handle lapse (quality < 3)
  if (quality < 3) {
    repetitions = 0
    interval = 1 // relearn tomorrow (daily cadence)
    lapses += 1
    status = 'relearning'
  } else {
    // Step 3: Pass — advance
    repetitions += 1
    if (repetitions === 1) {
      interval = 1
    } else if (repetitions === 2) {
      interval = 6
    } else {
      interval = Math.round(interval * easeFactor)
    }

    // Status transitions
    if (quality === 3) {
      status = 'review'
    } else if (quality === 4) {
      status = repetitions >= 3 ? 'mastered' : 'review'
    } else {
      // quality === 5 (easy)
      status = repetitions >= 2 ? 'mastered' : 'review'
    }
  }

  // Cap interval at 365 days to avoid runaway scheduling
  if (interval > 365) interval = 365

  return {
    easeFactor: Number(easeFactor.toFixed(2)),
    interval,
    repetitions,
    nextDueDate: now + interval * 24 * 60 * 60 * 1000,
    lastReviewed: now,
    lapses,
    status,
  }
}

/**
 * Snooze a card — push nextDueDate by N days WITHOUT touching SM-2 state.
 * This fixes the audit finding where snooze was POSTing quality=2,
 * which lapses the schedule and damages ease.
 */
export function snoozeSchedule(schedule: Sm2Schedule, days: number = 1, now: number = Date.now()): Sm2Schedule {
  return {
    ...schedule,
    nextDueDate: now + days * 24 * 60 * 60 * 1000,
  }
}

/**
 * Check if a schedule is due for review.
 */
export function isDue(schedule: Sm2Schedule, now: number = Date.now()): boolean {
  return schedule.nextDueDate <= now
}

/**
 * Get a human-readable description of the next interval.
 */
export function describeInterval(interval: number): string {
  if (interval === 0) return 'now'
  if (interval === 1) return 'tomorrow'
  if (interval < 7) return `in ${interval} days`
  if (interval < 30) return `in ${Math.round(interval / 7)} week${Math.round(interval / 7) > 1 ? 's' : ''}`
  if (interval < 365) return `in ${Math.round(interval / 30)} month${Math.round(interval / 30) > 1 ? 's' : ''}`
  return `in ${Math.round(interval / 365)} year${Math.round(interval / 365) > 1 ? 's' : ''}`
}

/**
 * UI-facing rating presets — the 4 buttons shown to users.
 * Maps to the SM-2 quality scale.
 */
export const RATING_PRESETS = [
  { quality: 0 as Sm2Quality, label: 'Again', emoji: '↻', shortcut: '1', tone: 'destructive' as const, description: "Didn't recall" },
  { quality: 3 as Sm2Quality, label: 'Hard', emoji: '😕', shortcut: '2', tone: 'warning' as const, description: 'Struggled' },
  { quality: 4 as Sm2Quality, label: 'Good', emoji: '👍', shortcut: '3', tone: 'primary' as const, description: 'Recalled with effort' },
  { quality: 5 as Sm2Quality, label: 'Easy', emoji: '⚡', shortcut: '4', tone: 'success' as const, description: 'Instant recall' },
] as const

/**
 * Map SM-2 status to a display color token.
 */
export const STATUS_COLORS: Record<Sm2Status, string> = {
  new: 'var(--text-muted)',
  learning: 'var(--brand)',
  review: 'var(--info, var(--brand))',
  relearning: 'var(--destructive)',
  mastered: 'var(--success)',
}

/**
 * Idempotent XP ledger — the ONLY way to award XP on the server.
 *
 * - Every XP grant is recorded as an XpEvent with a unique idempotencyKey.
 * - Duplicate grants for the same key are ignored (no double-awarding).
 * - User.xp is kept in sync as a cached total.
 * - The browser can NEVER call this directly; it's server-only.
 */
import 'server-only'
import { db } from '@/lib/db'

export type XpEventType =
  | 'lesson_complete'
  | 'question_correct'
  | 'question_attempt'
  | 'quiz_submit'
  | 'revision'
  | 'coding_pass'
  | 'achievement'
  | 'contribution'
  | 'streak'
  | 'focus_session'
  | 'daily_quest_bonus'
  | 'tutor_interaction'

export interface AwardXpInput {
  userId: string
  eventType: XpEventType
  amount: number
  /** Stable unique key — e.g. `lesson_complete:{lessonId}:{mode}` or `quiz_submit:{attemptId}` */
  idempotencyKey: string
  /** Optional source resource ID */
  sourceId?: string
}

/**
 * Award XP idempotently. If the idempotencyKey already exists, this is a no-op
 * (returns { awarded: false, amount: 0 }). Otherwise creates the event and
 * increments User.xp within a transaction.
 */
export async function awardXp(input: AwardXpInput): Promise<{ awarded: boolean; amount: number; totalXp: number }> {
  try {
    const result = await db.$transaction(async (tx) => {
      // Check for existing event with this idempotency key.
      const existing = await tx.xpEvent.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        select: { id: true },
      })
      if (existing) {
        const user = await tx.user.findUnique({ where: { id: input.userId }, select: { xp: true } })
        return { awarded: false, amount: 0, totalXp: user?.xp ?? 0 }
      }

      await tx.xpEvent.create({
        data: {
          userId: input.userId,
          eventType: input.eventType,
          amount: input.amount,
          idempotencyKey: input.idempotencyKey,
          sourceId: input.sourceId ?? null,
        },
      })

      const updated = await tx.user.update({
        where: { id: input.userId },
        data: { xp: { increment: input.amount } },
        select: { xp: true },
      })

      return { awarded: true, amount: input.amount, totalXp: updated.xp }
    })
    return result
  } catch (err) {
    // If the unique constraint catches a race, treat as already-awarded.
    console.error('[xp] awardXp error:', err)
    const user = await db.user.findUnique({ where: { id: input.userId }, select: { xp: true } })
    return { awarded: false, amount: 0, totalXp: user?.xp ?? 0 }
  }
}

/**
 * Recompute a user's total XP from the ledger (source of truth).
 * Use to repair drift or verify cached User.xp.
 */
export async function recomputeXp(userId: string): Promise<number> {
  const agg = await db.xpEvent.aggregate({
    where: { userId },
    _sum: { amount: true },
  })
  const total = agg._sum.amount ?? 0
  await db.user.update({ where: { id: userId }, data: { xp: total } })
  return total
}

/**
 * Derive level from XP. Simple curve: level = floor(sqrt(xp / 100)) + 1.
 */
export function levelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1
}

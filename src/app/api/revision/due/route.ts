import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, withApi, okResponse, ApiError } from '@/lib/auth'
import { parseBody, revisionReviewSchema } from '@/lib/schemas'
import { awardXp } from '@/lib/xp'
import { evaluateAchievements } from '@/lib/achievements'
import { DEMO_REVISION_DUE, isDemoMode } from '@/lib/demo-fixtures'

/**
 * GET /api/revision/due
 * Returns the current user's revision schedule grouped by due/overdue/upcoming.
 */
export async function GET() {
  return withApi(async () => {
    if (isDemoMode()) return okResponse(DEMO_REVISION_DUE)

    const user = await requireUser()

    const now = new Date()
    const endOfDay = new Date(now)
    endOfDay.setHours(23, 59, 59, 999)

    const all = await db.revisionSchedule.findMany({
      where: { userId: user.id },
      include: { topic: { include: { unit: { include: { subject: true } } } } },
      orderBy: { nextDueDate: 'asc' },
    })

    const dueToday = all.filter((r) => r.nextDueDate <= endOfDay)
    const overdue = all.filter(
      (r) => r.nextDueDate < now && r.nextDueDate.toDateString() !== now.toDateString(),
    )
    const upcoming = all.filter((r) => r.nextDueDate > endOfDay).slice(0, 10)

    return okResponse({ dueToday, overdue, upcoming, all })
  })
}

/**
 * POST /api/revision/due
 * Records a revision attempt and advances the SM-2 schedule.
 *
 * SECURITY:
 *   - Schedule ownership is enforced by querying with `{ id, userId: user.id }`.
 *     A 404 is returned if the schedule belongs to another user.
 *   - XP is awarded idempotently via the ledger (per attempt id).
 *   - Achievement evaluation runs after the verified write.
 */
export async function POST(req: NextRequest) {
  return withApi(async () => {
    const user = await requireUser()
    const body = await parseBody(req, revisionReviewSchema)

    // Enforce ownership at the query — never trust the scheduleId alone.
    const schedule = await db.revisionSchedule.findFirst({
      where: { id: body.scheduleId, userId: user.id },
      include: { topic: true },
    })
    if (!schedule) {
      throw new ApiError('NOT_FOUND', 'Revision schedule not found.', 404, false)
    }

    // SM-2 algorithm.
    let easeFactor = schedule.easeFactor
    let intervalDays: number
    const q = Math.max(0, Math.min(5, body.quality))

    if (q < 3) {
      intervalDays = 1
    } else {
      easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
      if (schedule.intervalDays <= 1) intervalDays = 3
      else if (schedule.intervalDays <= 3) intervalDays = 7
      else if (schedule.intervalDays <= 7) intervalDays = 14
      else intervalDays = Math.round(schedule.intervalDays * easeFactor)
    }

    const nextDue = new Date()
    nextDue.setDate(nextDue.getDate() + intervalDays)

    const newState =
      q >= 4 ? 'mastered' : q >= 3 ? 'proficient' : q >= 2 ? 'revising' : 'weak'

    const updated = await db.revisionSchedule.update({
      where: { id: schedule.id },
      data: { intervalDays, easeFactor, nextDueDate: nextDue, state: newState },
    })

    const revisionAttempt = await db.revisionAttempt.create({
      data: {
        userId: user.id,
        scheduleId: schedule.id,
        activityType: body.activityType ?? schedule.activityType,
        correct: q >= 3,
        quality: q,
      },
    })

    // Update mastery.
    const topicId = schedule.topicId
    const mastery = await db.userTopicMastery.findUnique({
      where: { userId_topicId: { userId: user.id, topicId } },
    })
    if (mastery) {
      await db.userTopicMastery.update({
        where: { id: mastery.id },
        data: { state: newState, nextRevision: nextDue, lastPractised: new Date() },
      })
    }

    // Award XP via the idempotent ledger (keyed per revision attempt).
    const xpAmount = q >= 3 ? 8 : 3
    const xp = await awardXp({
      userId: user.id,
      eventType: 'revision',
      amount: xpAmount,
      idempotencyKey: `revision_attempt:${revisionAttempt.id}`,
      sourceId: revisionAttempt.id,
    })

    // Achievement evaluation.
    try {
      await evaluateAchievements({ userId: user.id, trigger: 'revision' })
    } catch {
      // never break user flow
    }

    // Re-read authoritative total after achievement awards.
    const finalUser = await db.user.findUnique({
      where: { id: user.id },
      select: { xp: true },
    })

    return okResponse({
      ...updated,
      xpGain: xp.awarded ? xp.amount : 0,
      totalXp: finalUser?.xp ?? 0,
    })
  })
}

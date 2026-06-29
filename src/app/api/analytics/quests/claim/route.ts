import { requireUser, withApi, ApiError, okResponse } from '@/lib/auth'
import { db } from '@/lib/db'
import { awardXp } from '@/lib/xp'
import { evaluateAchievements } from '@/lib/achievements'
import {
  getStudentLearningScope,
  scopedLessonWhere,
  subjectIdsForLearningScope,
  topicIdsForLearningScope,
} from '@/features/learning/server/get-student-learning-scope'

/**
 * POST /api/analytics/quests/claim
 *
 * Claims the "All Quests Complete" daily bonus. Awards +50 XP and grants
 * 1 streak freeze (capped at 5) when all 5 daily quests are complete.
 *
 * Idempotent per calendar day — the idempotency key includes the user id
 * and the YYYY-MM-DD date, so claiming twice on the same day is a no-op
 * (returns current state without re-awarding).
 *
 * Response:
 *   {
 *     ok: true,
 *     data: {
 *       awarded: boolean,        // false if already claimed today or quests incomplete
 *       reason: 'ok' | 'already_claimed' | 'quests_incomplete',
 *       bonusXp: number,         // 50 if awarded, else 0
 *       freezesGranted: number,  // 1 if awarded AND under cap, else 0
 *       freezes: number,         // total freezes after grant
 *       maxFreezes: 5,
 *       allComplete: boolean,
 *     }
 *   }
 *
 * Side-effects:
 *   - Creates an XpEvent with type 'daily_quest_bonus' (idempotent).
 *   - Increments user.streakFreezes by 1 (capped at 5) via conditional update.
 */
const BONUS_XP = 50
const MAX_FREEZES = 5

export async function POST() {
  return withApi(async () => {
    const authUser = await requireUser()
    const today = new Date().toISOString().slice(0, 10)
    const idempotencyKey = `daily_quest_bonus:${authUser.id}:${today}`

    // 1) Check idempotency: if we've already awarded today, return current state.
    const existing = await db.xpEvent.findUnique({
      where: { idempotencyKey },
      select: { id: true },
    })
    if (existing) {
      const user = await db.user.findUnique({
        where: { id: authUser.id },
        select: { streakFreezes: true },
      })
      return okResponse({
        awarded: false,
        reason: 'already_claimed',
        bonusXp: 0,
        freezesGranted: 0,
        freezes: user?.streakFreezes ?? 0,
        maxFreezes: MAX_FREEZES,
        allComplete: true,
      })
    }

    // 2) Re-aggregate today's quests to verify all 5 are complete (server-authoritative).
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart)
    todayEnd.setDate(todayEnd.getDate() + 1)

    const user = await db.user.findUnique({
      where: { id: authUser.id },
      select: { id: true, dailyMins: true, streakFreezes: true },
    })
    if (!user) throw new ApiError('NOT_FOUND', 'User not found.', 404, false)
    const scope = await getStudentLearningScope(user.id)
    const scopedSubjectIds = subjectIdsForLearningScope(scope)
    const scopedTopicIds = topicIdsForLearningScope(scope)
    const hasLearningScope = Boolean(scope && scopedSubjectIds.length > 0)

    const dailyGoalMins = user.dailyMins || 120
    const xpTarget = Math.max(80, Math.round(dailyGoalMins * 1.2))

    const [lessonsToday, questionsToday, sessionsToday, revisionsToday, xpEventsToday] =
      await Promise.all([
        hasLearningScope
          ? db.lessonCompletion.count({
              where: {
                userId: user.id,
                completedAt: { gte: todayStart, lt: todayEnd },
                lesson: scopedLessonWhere(scope!),
              },
            })
          : 0,
        hasLearningScope
          ? db.questionAttempt.count({
              where: {
                userId: user.id,
                createdAt: { gte: todayStart, lt: todayEnd },
                question: { subjectId: { in: scopedSubjectIds } },
              },
            })
          : 0,
        hasLearningScope
          ? db.studySession.findMany({
              where: {
                userId: user.id,
                startedAt: { gte: todayStart, lt: todayEnd },
                OR: [{ subjectId: null }, { subjectId: { in: scopedSubjectIds } }],
              },
              select: { durationMins: true },
            })
          : [],
        hasLearningScope
          ? countScopedRevisionAttemptsToday(user.id, scopedTopicIds, todayStart, todayEnd)
          : 0,
        db.xpEvent.findMany({
          where: { userId: user.id, createdAt: { gte: todayStart, lt: todayEnd } },
          select: { amount: true },
        }),
      ])

    const minutesToday = sessionsToday.reduce((s, x) => s + (x.durationMins || 0), 0)
    const xpToday = xpEventsToday.reduce((s, e) => s + e.amount, 0)

    const quests = [
      lessonsToday >= 1,
      questionsToday >= 5,
      minutesToday >= dailyGoalMins,
      revisionsToday >= 5,
      xpToday >= xpTarget,
    ]
    const allComplete = quests.every(Boolean)
    if (!allComplete) {
      return okResponse({
        awarded: false,
        reason: 'quests_incomplete',
        bonusXp: 0,
        freezesGranted: 0,
        freezes: user.streakFreezes,
        maxFreezes: MAX_FREEZES,
        allComplete: false,
      })
    }

    // 3) Award the bonus XP idempotently.
    const xp = await awardXp({
      userId: user.id,
      eventType: 'daily_quest_bonus',
      amount: BONUS_XP,
      idempotencyKey,
    })

    // 4) Grant a streak freeze (capped). Use a conditional update so we never
    // exceed MAX_FREEZES even on a race.
    let freezesGranted = 0
    let finalFreezes = user.streakFreezes
    if (user.streakFreezes < MAX_FREEZES) {
      const updated = await db.user.update({
        where: { id: user.id },
        data: { streakFreezes: { increment: 1 } },
        select: { streakFreezes: true },
      })
      finalFreezes = updated.streakFreezes
      freezesGranted = 1
    }

    // 5) Evaluate quest-mastery achievements (quest_master_3, quest_master_7, xp_*)
    const newlyUnlocked = await evaluateAchievements({
      userId: user.id,
      trigger: 'daily_quest_bonus',
    })

    return okResponse({
      awarded: xp.awarded,
      reason: 'ok',
      bonusXp: xp.awarded ? xp.amount : 0,
      freezesGranted,
      freezes: finalFreezes,
      maxFreezes: MAX_FREEZES,
      allComplete: true,
      newlyUnlocked,
    })
  })
}

async function countScopedRevisionAttemptsToday(
  userId: string,
  topicIds: string[],
  todayStart: Date,
  todayEnd: Date,
): Promise<number> {
  if (topicIds.length === 0) return 0
  const schedules = await db.revisionSchedule.findMany({
    where: { userId, topicId: { in: topicIds } },
    select: { id: true },
  })
  if (schedules.length === 0) return 0
  return db.revisionAttempt.count({
    where: {
      userId,
      scheduleId: { in: schedules.map((schedule) => schedule.id) },
      createdAt: { gte: todayStart, lt: todayEnd },
    },
  })
}

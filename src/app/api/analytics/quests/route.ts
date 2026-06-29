import { NextResponse } from 'next/server'
import { requireUser, errorResponse } from '@/lib/auth'
import { db } from '@/lib/db'
import { DEMO_QUESTS, isDemoMode } from '@/lib/demo-fixtures'
import {
  getStudentLearningScope,
  scopedLessonWhere,
  subjectIdsForLearningScope,
  topicIdsForLearningScope,
} from '@/features/learning/server/get-student-learning-scope'

/**
 * GET /api/analytics/quests
 *
 * Daily Quests — server-aggregated "today's quests" used by the Dashboard
 * Quests widget. Each quest is computed from real DB activity for the
 * current calendar day (server's local date), so progress is always
 * server-authoritative and cannot be spoofed from the client.
 *
 * Response shape:
 *   {
 *     date: string,            // YYYY-MM-DD
 *     quests: Quest[],         // 5 fixed daily quests with progress
 *     totalXp: number,         // sum of xpReward for completed quests
 *     completedCount: number,  // 0..5
 *   }
 *
 * Quest shape:
 *   { key, label, description, icon, xpReward, current, target, unit, done }
 */
export async function GET() {
  try {
    if (isDemoMode()) {
      return NextResponse.json({ ok: true, data: DEMO_QUESTS })
    }

    const authUser = await requireUser()
    const user = await db.user.findUnique({
      where: { id: authUser.id },
      select: { id: true, dailyMins: true },
    })
    if (!user) return errorResponse({ status: 404, message: 'User not found' })
    const scope = await getStudentLearningScope(user.id)
    const scopedSubjectIds = subjectIdsForLearningScope(scope)
    const scopedTopicIds = topicIdsForLearningScope(scope)
    const hasLearningScope = Boolean(scope && scopedSubjectIds.length > 0)

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart)
    todayEnd.setDate(todayEnd.getDate() + 1)

    // ──────────────────────────────────────────────────────────────
    // Aggregate today's activity in a single round-trip where possible.
    // ──────────────────────────────────────────────────────────────
    const [
      lessonsToday,
      questionsToday,
      sessionsToday,
      revisionsToday,
      xpEventsToday,
    ] = await Promise.all([
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
            select: { durationMins: true, xpEarned: true },
          })
        : [],
      hasLearningScope
        ? countScopedRevisionAttemptsToday(user.id, scopedTopicIds, todayStart, todayEnd)
        : 0,
      db.xpEvent.findMany({
        where: {
          userId: user.id,
          createdAt: { gte: todayStart, lt: todayEnd },
        },
        select: { amount: true, eventType: true },
      }),
    ])

    const minutesToday = sessionsToday.reduce(
      (sum, s) => sum + (s.durationMins || 0),
      0,
    )
    const xpToday = xpEventsToday.reduce((sum, e) => sum + e.amount, 0)
    const correctToday = xpEventsToday
      .filter((e) => e.eventType === 'question_correct')
      .length

    // ──────────────────────────────────────────────────────────────
    // Build the 5 daily quests. Targets are tuned for a 2-hour daily
    // study session — achievable but not trivial.
    // ──────────────────────────────────────────────────────────────
    const dailyGoalMins = user.dailyMins || 120
    const xpTarget = Math.max(80, Math.round(dailyGoalMins * 1.2)) // ~1.2 XP per minute

    const quests = [
      {
        key: 'lesson',
        label: 'Complete a Lesson',
        description: 'Finish any lesson in any mode',
        icon: 'book',
        xpReward: 25,
        current: lessonsToday,
        target: 1,
        unit: 'lesson',
        done: lessonsToday >= 1,
      },
      {
        key: 'practice',
        label: 'Practice 5 Questions',
        description: 'Attempt at least 5 practice questions',
        icon: 'pen',
        xpReward: 30,
        current: questionsToday,
        target: 5,
        unit: 'questions',
        done: questionsToday >= 5,
      },
      {
        key: 'focus',
        label: `Study ${Math.round(dailyGoalMins / 60 * 10) / 10}h`,
        description: `Hit your daily focus goal of ${dailyGoalMins} min`,
        icon: 'clock',
        xpReward: 40,
        current: minutesToday,
        target: dailyGoalMins,
        unit: 'min',
        done: minutesToday >= dailyGoalMins,
      },
      {
        key: 'revision',
        label: 'Review 5 Cards',
        description: 'Revise 5 spaced-repetition cards',
        icon: 'rotate',
        xpReward: 25,
        current: revisionsToday,
        target: 5,
        unit: 'cards',
        done: revisionsToday >= 5,
      },
      {
        key: 'xp',
        label: `Earn ${xpTarget} XP`,
        description: 'Reach today\u2019s XP target',
        icon: 'zap',
        xpReward: 50,
        current: xpToday,
        target: xpTarget,
        unit: 'XP',
        done: xpToday >= xpTarget,
      },
    ]

    const completedCount = quests.filter((q) => q.done).length
    const totalXp = quests.filter((q) => q.done).reduce((s, q) => s + q.xpReward, 0)

    return NextResponse.json({
      ok: true,
      data: {
        date: todayStart.toISOString().slice(0, 10),
        quests,
        completedCount,
        totalXp,
        correctToday,
        minutesToday,
        xpToday,
        dailyGoalMins,
      },
    })
  } catch (e) {
    return errorResponse(e)
  }
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

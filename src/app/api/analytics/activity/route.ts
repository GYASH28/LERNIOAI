import { NextResponse } from 'next/server'
import { requireUser, errorResponse } from '@/lib/auth'
import { db } from '@/lib/db'
import { DEMO_ACTIVITY, isDemoMode } from '@/lib/demo-fixtures'
import {
  getStudentLearningScope,
  scopedLessonWhere,
  subjectIdsForLearningScope,
} from '@/features/learning/server/get-student-learning-scope'

/**
 * GET /api/analytics/activity
 * Returns activity-based XP aggregates for dashboard widgets:
 *   - xpByDay: number[7]    XP earned per day for the last 7 days (oldest first)
 *   - activeDays: string[]  ISO date strings for the heatmap (last 13 weeks)
 *   - minutesToday: number  Study minutes logged today (for the daily goal ring)
 *   - dailyGoalMins: number The user's configured daily goal (default 60)
 */
export async function GET() {
  try {
    if (isDemoMode()) {
      return NextResponse.json({ ok: true, data: DEMO_ACTIVITY })
    }

    const authUser = await requireUser()
    const user = await db.user.findUnique({
      where: { id: authUser.id },
      select: { id: true, dailyMins: true },
    })
    if (!user) return errorResponse({ status: 404, message: 'User not found' })
    const scope = await getStudentLearningScope(user.id)
    const scopedSubjectIds = subjectIdsForLearningScope(scope)
    const scopedSessionWhere = scopedSubjectIds.length > 0
      ? { OR: [{ subjectId: null }, { subjectId: { in: scopedSubjectIds } }] }
      : { subjectId: null }

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // --- Last 7 days XP from StudySession + XpEvent ---
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    const [xpEvents, sessions] = await Promise.all([
      db.xpEvent.findMany({
        where: { userId: user.id, createdAt: { gte: sevenDaysAgo } },
        select: { amount: true, createdAt: true },
      }),
      db.studySession.findMany({
        where: { userId: user.id, startedAt: { gte: sevenDaysAgo }, ...scopedSessionWhere },
        select: { xpEarned: true, durationMins: true, startedAt: true },
      }),
    ])

    const xpByDay = Array.from({ length: 7 }, () => 0)
    const dayBuckets: Date[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() - (6 - i))
      d.setHours(0, 0, 0, 0)
      dayBuckets.push(d)
    }
    const dayKey = (d: Date) => d.toDateString()
    const bucketIndex = (d: Date) => dayBuckets.findIndex((b) => dayKey(b) === dayKey(d))

    const hasXpEvents = xpEvents.length > 0
    if (hasXpEvents) {
      for (const ev of xpEvents) {
        const idx = bucketIndex(ev.createdAt)
        if (idx >= 0) xpByDay[idx] += ev.amount
      }
    } else {
      for (const s of sessions) {
        const idx = bucketIndex(s.startedAt)
        if (idx >= 0) xpByDay[idx] += s.xpEarned || 0
      }
    }

    // --- Minutes today ---
    const minutesToday = sessions
      .filter((s) => new Date(s.startedAt).toDateString() === todayStart.toDateString())
      .reduce((sum, s) => sum + (s.durationMins || 0), 0)

    // --- Heatmap active days: last 13 weeks = 91 days ---
    const heatStart = new Date(now)
    heatStart.setDate(heatStart.getDate() - 90)
    heatStart.setHours(0, 0, 0, 0)

    const [heatXp, heatSessions, lessonDays, qaDays] = await Promise.all([
      db.xpEvent.findMany({
        where: { userId: user.id, createdAt: { gte: heatStart } },
        select: { createdAt: true },
      }),
      db.studySession.findMany({
        where: { userId: user.id, startedAt: { gte: heatStart }, ...scopedSessionWhere },
        select: { startedAt: true },
      }),
      scope && scopedSubjectIds.length > 0
        ? db.lessonCompletion.findMany({
            where: { userId: user.id, completedAt: { gte: heatStart }, lesson: scopedLessonWhere(scope) },
            select: { completedAt: true },
          })
        : [],
      scopedSubjectIds.length > 0
        ? db.questionAttempt.findMany({
            where: {
              userId: user.id,
              createdAt: { gte: heatStart },
              question: { subjectId: { in: scopedSubjectIds } },
            },
            select: { createdAt: true },
          })
        : [],
    ])

    const activeDaySet = new Set<string>()
    for (const ev of heatXp) activeDaySet.add(ev.createdAt.toISOString().slice(0, 10))
    for (const s of heatSessions) activeDaySet.add(s.startedAt.toISOString().slice(0, 10))
    for (const l of lessonDays) {
      if (l.completedAt) activeDaySet.add(l.completedAt.toISOString().slice(0, 10))
    }
    for (const q of qaDays) activeDaySet.add(q.createdAt.toISOString().slice(0, 10))

    return NextResponse.json({
      ok: true,
      data: {
        xpByDay,
        activeDays: Array.from(activeDaySet),
        minutesToday,
        dailyGoalMins: user.dailyMins || 60,
      },
    })
  } catch (e) {
    return errorResponse(e)
  }
}

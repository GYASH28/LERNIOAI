import { NextResponse } from 'next/server'
import { requireUser, errorResponse } from '@/lib/auth'
import { db } from '@/lib/db'
import { getLocalDateStringInKolkata, getLocalDayStartInKolkata } from '@/lib/timezone'

/**
 * GET /api/analytics/focus
 *
 * Returns aggregated focus-session analytics for the Analytics view's new
 * "Focus Sessions" panel. Built on real StudySession rows logged by the
 * Pomodoro Focus Timer (POST /api/study/focus).
 *
 * Response shape:
 *   {
 *     todayMins, todayCount,
 *     weekMins, weekCount,
 *     allMins, allCount,
 *     dailySeries: [{ date: 'YYYY-MM-DD', minutes, count }],
 *     subjectBreakdown: [{ subjectId, subjectName, minutes, color }],
 *     activityBreakdown: [{ activity, minutes, count }],
 *     currentStreak,        // consecutive days with >=1 focus session
 *     bestDayMins,          // best single-day total over the last 30 days
 *     avgMinsPerSession,    // all-time mean
 *   }
 *
 * All numbers are server-authoritative — the client cannot influence them.
 */
export async function GET() {
  try {
    const authUser = await requireUser()

    const now = new Date()
    const todayStart = getLocalDayStartInKolkata(now)
    const weekStart = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000) // last 7 days inclusive
    const seriesStart = new Date(todayStart.getTime() - 13 * 24 * 60 * 60 * 1000) // 14-day trend
    const monthStart = new Date(todayStart.getTime() - 29 * 24 * 60 * 60 * 1000) // 30-day window for best-day & streak

    const [todayAgg, weekAgg, allAgg, recentSessions, subjectAgg, activityAgg] =
      await Promise.all([
        db.studySession.aggregate({
          where: {
            userId: authUser.id,
            startedAt: { gte: todayStart },
          },
          _sum: { durationMins: true },
          _count: true,
        }),
        db.studySession.aggregate({
          where: {
            userId: authUser.id,
            startedAt: { gte: weekStart },
          },
          _sum: { durationMins: true },
          _count: true,
        }),
        db.studySession.aggregate({
          where: { userId: authUser.id },
          _sum: { durationMins: true },
          _count: true,
        }),
        // All sessions in the last 30 days for streak + best-day + 14-day series
        db.studySession.findMany({
          where: {
            userId: authUser.id,
            startedAt: { gte: monthStart },
          },
          select: { durationMins: true, startedAt: true, activity: true, subjectId: true },
        }),
        // Subject breakdown for last 30 days (subject relation is via subjectId;
        // we resolve subject metadata in a follow-up query below).
        db.studySession.findMany({
          where: {
            userId: authUser.id,
            startedAt: { gte: monthStart },
            subjectId: { not: null },
          },
          select: {
            durationMins: true,
            subjectId: true,
          },
        }),
        // Activity breakdown for last 30 days
        db.studySession.findMany({
          where: {
            userId: authUser.id,
            startedAt: { gte: monthStart },
          },
          select: { durationMins: true, activity: true },
        }),
      ])

    // ──────────────────────────────────────────────────────────────
    // Build the 14-day daily series
    // ──────────────────────────────────────────────────────────────
    const dailyMap = new Map<string, { minutes: number; count: number }>()
    for (let i = 13; i >= 0; i--) {
      const d = new Date(seriesStart.getTime() + i * 24 * 60 * 60 * 1000)
      const key = getLocalDateStringInKolkata(d)
      dailyMap.set(key, { minutes: 0, count: 0 })
    }
    for (const s of recentSessions) {
      const key = getLocalDateStringInKolkata(s.startedAt)
      const entry = dailyMap.get(key)
      if (entry) {
        entry.minutes += s.durationMins || 0
        entry.count += 1
      }
    }
    const dailySeries = Array.from(dailyMap.entries()).map(([date, v]) => ({
      date,
      minutes: v.minutes,
      count: v.count,
    }))

    // ──────────────────────────────────────────────────────────────
    // Streak of consecutive days with >=1 focus session (counting today
    // only if there's actually been a session today — otherwise start
    // from yesterday so a mid-day view doesn't read as "0 streak").
    // ──────────────────────────────────────────────────────────────
    const dayHasSession = new Set<string>()
    for (const s of recentSessions) {
      dayHasSession.add(getLocalDateStringInKolkata(s.startedAt))
    }
    let currentStreak = 0
    const cursor = new Date(todayStart)
    // If no session today, start the streak check from yesterday so we
    // don't reset to 0 just because the student hasn't started studying yet.
    if (!dayHasSession.has(getLocalDateStringInKolkata(cursor))) {
      cursor.setTime(cursor.getTime() - 24 * 60 * 60 * 1000)
    }
    while (dayHasSession.has(getLocalDateStringInKolkata(cursor))) {
      currentStreak += 1
      cursor.setTime(cursor.getTime() - 24 * 60 * 60 * 1000)
    }

    // Best day in last 30 days
    const perDayMins = new Map<string, number>()
    for (const s of recentSessions) {
      const k = getLocalDateStringInKolkata(s.startedAt)
      perDayMins.set(k, (perDayMins.get(k) ?? 0) + (s.durationMins || 0))
    }
    const bestDayMins = perDayMins.size ? Math.max(...perDayMins.values()) : 0

    // ──────────────────────────────────────────────────────────────
    // Subject breakdown — fetch subject metadata in one extra query
    // (StudySession.subjectId is just a plain string column with no
    // Prisma relation; we resolve names/colours here).
    // ──────────────────────────────────────────────────────────────
    const subjectIds = Array.from(
      new Set(subjectAgg.map((s) => s.subjectId).filter((x): x is string => !!x)),
    )
    const subjects = subjectIds.length
      ? await db.subject.findMany({
          where: { id: { in: subjectIds } },
          select: { id: true, name: true, code: true, accentColor: true },
        })
      : []
    const subjectMeta = new Map(subjects.map((s) => [s.id, s]))
    const subjectMap = new Map<string, { minutes: number; name: string; code: string; color: string }>()
    for (const s of subjectAgg) {
      if (!s.subjectId) continue
      const meta = subjectMeta.get(s.subjectId)
      const existing = subjectMap.get(s.subjectId) ?? {
        minutes: 0,
        name: meta?.name ?? 'Subject',
        code: meta?.code ?? '—',
        color: meta?.accentColor || '#7c3aed',
      }
      existing.minutes += s.durationMins || 0
      subjectMap.set(s.subjectId, existing)
    }
    const subjectBreakdown = Array.from(subjectMap.entries())
      .map(([id, v]) => ({ subjectId: id, subjectName: v.name, subjectCode: v.code, color: v.color, minutes: v.minutes }))
      .sort((a, b) => b.minutes - a.minutes)

    // ──────────────────────────────────────────────────────────────
    // Activity breakdown
    // ──────────────────────────────────────────────────────────────
    const activityMap = new Map<string, { minutes: number; count: number }>()
    for (const s of activityAgg) {
      const k = s.activity
      const ex = activityMap.get(k) ?? { minutes: 0, count: 0 }
      ex.minutes += s.durationMins || 0
      ex.count += 1
      activityMap.set(k, ex)
    }
    const activityBreakdown = Array.from(activityMap.entries())
      .map(([activity, v]) => ({ activity, minutes: v.minutes, count: v.count }))
      .sort((a, b) => b.minutes - a.minutes)

    const allMins = allAgg._sum.durationMins ?? 0
    const allCount = allAgg._count
    const avgMinsPerSession = allCount > 0 ? Math.round(allMins / allCount) : 0

    return NextResponse.json({
      ok: true,
      data: {
        todayMins: todayAgg._sum.durationMins ?? 0,
        todayCount: todayAgg._count,
        weekMins: weekAgg._sum.durationMins ?? 0,
        weekCount: weekAgg._count,
        allMins,
        allCount,
        dailySeries,
        subjectBreakdown,
        activityBreakdown,
        currentStreak,
        bestDayMins,
        avgMinsPerSession,
      },
    })
  } catch (e) {
    return errorResponse(e)
  }
}

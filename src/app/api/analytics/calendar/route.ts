import { db } from '@/lib/db'
import { requireUser, withApi, okResponse } from '@/lib/auth'
import {
  getStudentLearningScope,
  subjectIdsForLearningScope,
} from '@/features/learning/server/get-student-learning-scope'

/**
 * GET /api/analytics/calendar?year=2026
 *
 * Returns a full-year study calendar for the current user — daily XP earned +
 * study minutes + session count, suitable for rendering a GitHub-style
 * contribution heatmap.
 *
 * Output:
 *  {
 *    year, totalXp, totalMinutes, activeDays, bestDay,
 *    days: [{ date: 'YYYY-MM-DD', xp, minutes, sessions, level }]
 *  }
 *
 * `level` is 0..4 bucket derived from minutes (0=none, 1=<15, 2=<30, 3=<60, 4=>=60).
 * This keeps the heatmap color scale meaningful even for light study days.
 */
export async function GET(req: Request) {
  return withApi(async () => {
    const user = await requireUser()
    const scope = await getStudentLearningScope(user.id)
    const scopedSubjectIds = subjectIdsForLearningScope(scope)

    // Parse ?year= — default to current year, clamp to [2020, currentYear+1]
    const url = new URL(req.url)
    const now = new Date()
    const currentYear = now.getFullYear()
    const yearParam = Number.parseInt(url.searchParams.get('year') ?? '', 10)
    const year =
      Number.isFinite(yearParam) && yearParam >= 2020 && yearParam <= currentYear + 1
        ? yearParam
        : currentYear

    // Year boundaries in UTC to match Prisma's ISO storage
    const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0))
    const end = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0))

    // Fetch all XP events + study sessions for the year in parallel
    const [xpEvents, sessions] = await Promise.all([
      db.xpEvent.findMany({
        where: { userId: user.id, createdAt: { gte: start, lt: end } },
        select: { amount: true, createdAt: true },
      }),
      db.studySession.findMany({
        where: {
          userId: user.id,
          startedAt: { gte: start, lt: end },
          OR: scopedSubjectIds.length > 0
            ? [{ subjectId: null }, { subjectId: { in: scopedSubjectIds } }]
            : [{ subjectId: null }],
        },
        select: { durationMins: true, startedAt: true },
      }),
    ])

    // Build a per-day map keyed by YYYY-MM-DD
    const byDay = new Map<
      string,
      { xp: number; minutes: number; sessions: number }
    >()

    const dateKey = (d: Date) => d.toISOString().slice(0, 10)

    for (const ev of xpEvents) {
      const k = dateKey(ev.createdAt)
      const cur = byDay.get(k) ?? { xp: 0, minutes: 0, sessions: 0 }
      cur.xp += ev.amount
      byDay.set(k, cur)
    }
    for (const s of sessions) {
      const k = dateKey(s.startedAt)
      const cur = byDay.get(k) ?? { xp: 0, minutes: 0, sessions: 0 }
      cur.minutes += s.durationMins
      cur.sessions += 1
      byDay.set(k, cur)
    }

    // Always return 365/366 entries so the heatmap grid is stable.
    const daysInYear = (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / 86_400_000
    const days: Array<{
      date: string
      xp: number
      minutes: number
      sessions: number
      level: 0 | 1 | 2 | 3 | 4
    }> = []

    let totalXp = 0
    let totalMinutes = 0
    let activeDays = 0
    let bestDay: { date: string; xp: number } | null = null

    for (let i = 0; i < daysInYear; i++) {
      const d = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0))
      d.setUTCDate(d.getUTCDate() + i)
      const k = dateKey(d)
      const e = byDay.get(k)
      const xp = e?.xp ?? 0
      const minutes = e?.minutes ?? 0
      const sess = e?.sessions ?? 0

      // Level bucket derived from minutes — keeps color scale meaningful.
      const level: 0 | 1 | 2 | 3 | 4 =
        minutes === 0 ? 0 : minutes < 15 ? 1 : minutes < 30 ? 2 : minutes < 60 ? 3 : 4

      days.push({ date: k, xp, minutes, sessions: sess, level })

      totalXp += xp
      totalMinutes += minutes
      if (minutes > 0) activeDays += 1
      if (xp > 0 && (!bestDay || xp > bestDay.xp)) bestDay = { date: k, xp }
    }

    return okResponse({
      year,
      totalXp,
      totalMinutes,
      activeDays,
      bestDay,
      days,
    })
  })
}

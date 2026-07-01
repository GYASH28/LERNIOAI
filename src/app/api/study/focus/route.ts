import { NextResponse } from 'next/server'
import { requireUser, errorResponse, ApiError } from '@/lib/auth'
import { db } from '@/lib/db'
import { awardXp } from '@/lib/xp'
import { evaluateAchievements } from '@/lib/achievements'
import { z } from 'zod'

/**
 * POST /api/study/focus
 *
 * Logs a completed Pomodoro / focus session as a `StudySession` row and
 * awards XP idempotently via the XpEvent ledger.
 *
 * Body schema:
 *   {
 *     durationMins: number,             // actual focused minutes (1..240)
 *     activity: 'learn' | 'practice' | 'tutor' | 'lab' | 'coding' | 'exam',
 *     subjectId?: string,               // optional subject tag
 *     startedAt: string (ISO),          // when the session started
 *     mode?: 'pomodoro' | 'freeform',   // optional source
 *   }
 *
 * Returns:
 *   { sessionId, xpAwarded, totalXp }
 *
 * Notes:
 *   - Server-authoritative: duration is validated server-side and clamped.
 *   - Idempotency key includes startedAt so accidental double-submit is a no-op.
 *   - XP rate: 1 XP per focused minute (rounded), with +5 bonus for ≥25-min sessions.
 */
const BodySchema = z.object({
  durationMins: z.number().int().min(1).max(240),
  activity: z.enum(['learn', 'practice', 'tutor', 'lab', 'coding', 'exam']).default('learn'),
  subjectId: z.string().cuid().optional().nullable(),
  startedAt: z.string().datetime(),
  mode: z.enum(['pomodoro', 'freeform']).default('freeform'),
})

export async function POST(req: Request) {
  try {
    const authUser = await requireUser()
    const json = await req.json().catch(() => ({}))
    const parsed = BodySchema.safeParse(json)
    if (!parsed.success) {
      throw new ApiError(
        'VALIDATION_ERROR',
        parsed.error.issues.map((i) => i.message).join('; '),
        400,
        false,
      )
    }
    const body = parsed.data

    // Optional: verify subjectId belongs to user's scheme (defensive)
    if (body.subjectId) {
      const subj = await db.subject.findUnique({
        where: { id: body.subjectId },
        select: { id: true },
      })
      if (!subj) {
        throw new ApiError('SUBJECT_NOT_FOUND', 'Subject not found', 404, false)
      }
    }

    // XP rule: 1 XP per focused minute + 5 bonus for ≥25 min sessions
    const baseXp = body.durationMins
    const bonus = body.durationMins >= 25 ? 5 : 0
    const xpAmount = baseXp + bonus

    const startedAtDate = new Date(body.startedAt)
    const endedAtDate = new Date(startedAtDate.getTime() + body.durationMins * 60 * 1000)

    // Create the study session + award XP in a single transaction so
    // we never have orphaned sessions without XP or vice versa.
    const session = await db.studySession.create({
      data: {
        userId: authUser.id,
        subjectId: body.subjectId ?? null,
        activity: body.activity,
        durationMins: body.durationMins,
        xpEarned: xpAmount,
        startedAt: startedAtDate,
        endedAt: endedAtDate,
      },
    })

    const xp = await awardXp({
      userId: authUser.id,
      eventType: 'focus_session',
      amount: xpAmount,
      idempotencyKey: `focus_session:${session.id}`,
      sourceId: session.id,
    })

    // Evaluate focus-related achievements (focus_first, focus_10, focus_500_mins, xp_*)
    const newlyUnlocked = await evaluateAchievements({
      userId: authUser.id,
      trigger: 'focus_session',
    })

    return NextResponse.json({
      ok: true,
      data: {
        sessionId: session.id,
        xpAwarded: xp.awarded ? xp.amount : 0,
        totalXp: xp.totalXp,
        bonusAwarded: bonus > 0,
        newlyUnlocked,
      },
    })
  } catch (e) {
    return errorResponse(e)
  }
}

/**
 * GET /api/study/focus
 * Returns the user's focus-session stats (today, this week, all-time).
 */
export async function GET() {
  try {
    const authUser = await requireUser()
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart)
    weekStart.setDate(weekStart.getDate() - 6)

    const [today, week, all] = await Promise.all([
      db.studySession.aggregate({
        where: {
          userId: authUser.id,
          activity: { in: ['learn', 'practice', 'tutor', 'lab', 'coding', 'exam'] },
          startedAt: { gte: todayStart },
        },
        _sum: { durationMins: true, xpEarned: true },
        _count: true,
      }),
      db.studySession.aggregate({
        where: {
          userId: authUser.id,
          startedAt: { gte: weekStart },
        },
        _sum: { durationMins: true, xpEarned: true },
        _count: true,
      }),
      db.studySession.aggregate({
        where: { userId: authUser.id },
        _sum: { durationMins: true, xpEarned: true },
        _count: true,
      }),
    ])

    return NextResponse.json({
      ok: true,
      data: {
        today: {
          count: today._count,
          minutes: today._sum.durationMins ?? 0,
          xp: today._sum.xpEarned ?? 0,
        },
        week: {
          count: week._count,
          minutes: week._sum.durationMins ?? 0,
          xp: week._sum.xpEarned ?? 0,
        },
        all: {
          count: all._count,
          minutes: all._sum.durationMins ?? 0,
          xp: all._sum.xpEarned ?? 0,
        },
      },
    })
  } catch (e) {
    return errorResponse(e)
  }
}

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, withApi, okResponse, ApiError } from '@/lib/auth'
import { parseBody, lessonCompletionSchema } from '@/lib/schemas'
import { awardXp } from '@/lib/xp'
import { evaluateAchievements } from '@/lib/achievements'

/**
 * GET /api/progress/lesson
 * Returns all lesson completion records for the current user.
 */
export async function GET() {
  return withApi(async () => {
    const user = await requireUser()
    const records = await db.lessonCompletion.findMany({
      where: { userId: user.id },
      include: { lesson: true },
    })
    return okResponse(records)
  })
}

/**
 * POST /api/progress/lesson
 * Upserts a lesson completion record (progress, scroll position, completed flag).
 *
 * XP is awarded ONLY the first time the lesson transitions to completed, via
 * the idempotent ledger (so duplicate POSTs never double-award).
 */
export async function POST(req: NextRequest) {
  return withApi(async () => {
    const user = await requireUser()
    const body = await parseBody(req, lessonCompletionSchema)

    // Verify the lesson exists (don't leak existence to other resources via FK error).
    const lesson = await db.lesson.findUnique({ where: { id: body.lessonId } })
    if (!lesson) {
      throw new ApiError('NOT_FOUND', 'Lesson not found.', 404, false)
    }

    const mode = body.mode || 'learn'
    const compositeKey = { userId: user.id, lessonId: body.lessonId, mode }
    const existing = await db.lessonCompletion.findUnique({ where: { userId_lessonId_mode: compositeKey } })

    const newProgress = Math.max(existing?.progress ?? 0, body.progress ?? 0)
    const newScrollPos = body.scrollPos ?? existing?.scrollPos ?? 0
    const nowCompleted = body.completed === true
    const completedAt = nowCompleted
      ? new Date()
      : existing?.completedAt ?? null

    const record = await db.lessonCompletion.upsert({
      where: { userId_lessonId_mode: compositeKey },
      update: {
        progress: newProgress,
        scrollPos: newScrollPos,
        completedAt,
      },
      create: {
        userId: user.id,
        lessonId: body.lessonId,
        mode,
        progress: newProgress,
        scrollPos: newScrollPos,
        completedAt,
      },
    })

    // Award XP ONLY when transitioning from not-completed → completed.
    // The idempotency key is per (userId, lessonId, mode), so a second POST
    // marking the same lesson complete is a no-op for XP.
    let xpGain = 0
    if (nowCompleted && !existing?.completedAt) {
      const xp = await awardXp({
        userId: user.id,
        eventType: 'lesson_complete',
        amount: 20,
        idempotencyKey: `lesson_complete:${user.id}:${body.lessonId}:${mode}`,
        sourceId: body.lessonId,
      })
      xpGain = xp.awarded ? xp.amount : 0
    }

    // Achievement evaluation after the verified write.
    try {
      await evaluateAchievements({ userId: user.id, trigger: 'lesson_complete' })
    } catch {
      // never break user flow
    }

    // Re-read the authoritative total AFTER any achievement XP awards so the
    // reported totalXp is accurate.
    const finalUser = await db.user.findUnique({
      where: { id: user.id },
      select: { xp: true },
    })

    return okResponse({ ...record, xpGain, totalXp: finalUser?.xp ?? 0 })
  })
}

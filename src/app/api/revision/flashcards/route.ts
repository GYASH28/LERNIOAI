import { db } from '@/lib/db'
import { requireUser, withApi, okResponse, ApiError } from '@/lib/auth'
import { awardXp } from '@/lib/xp'
import { evaluateAchievements } from '@/lib/achievements'
import { z } from 'zod'
import {
  getStudentLearningScope,
  isSubjectIdInLearningScope,
  scopedTopicWhere,
  subjectIdsForLearningScope,
} from '@/features/learning/server/get-student-learning-scope'

/**
 * Flashcard deck built from the user's SM-2 revision schedule.
 *
 * GET /api/revision/flashcards?subjectId=xxx&limit=20
 *   Returns up to `limit` (default 20, max 50) flashcards for due/overdue
 *   topics. Each card has a front (topic title) and back (description + any
 *   lesson "revise" content snippet we can find). Sorted by due date so the
 *   most overdue cards come first.
 *
 *   Response: {
 *     cards: Array<{
 *       scheduleId, topicId, subjectId, subjectName, subjectAccent,
 *       topicTitle, topicSlug, front, back, difficulty, dueAt, daysOverdue,
 *       easeFactor, intervalDays, state, attemptCount
 *     }>,
 *     totalDue: number
 *   }
 *
 * POST /api/revision/flashcards
 *   Body: { scheduleId, quality: 0|1|2|3|4|5 }
 *   Records a revision attempt + advances the SM-2 schedule (same logic as
 *   POST /api/revision/due, just packaged for the flashcard UX). Awards 5 XP
 *   per attempt (idempotent per scheduleId + date).
 *
 *   Response: {
 *     recorded: true,
 *     newIntervalDays, newEaseFactor, nextDueDate, xpAwarded, totalXp,
 *     newlyUnlocked: UnlockedAchievement[]
 *   }
 */

// ============================================================
// GET — fetch due cards
// ============================================================
export async function GET(req: Request) {
  return withApi(async () => {
    const user = await requireUser()
    const url = new URL(req.url)
    const subjectId = url.searchParams.get('subjectId')
    const limitParam = url.searchParams.get('limit')
    const limit = Math.max(1, Math.min(50, Number.parseInt(limitParam ?? '20', 10) || 20))
    const scope = await getStudentLearningScope(user.id)
    const scopedSubjectIds = subjectIdsForLearningScope(scope)
    if (!scope || scopedSubjectIds.length === 0) return okResponse({ cards: [], totalDue: 0 })
    if (subjectId && !isSubjectIdInLearningScope(scope, subjectId)) {
      return okResponse({ cards: [], totalDue: 0 })
    }

    const now = new Date()
    const endOfDay = new Date(now)
    endOfDay.setHours(23, 59, 59, 999)

    // Pull all schedules due today or earlier, optionally filtered by subject.
    // We include the topic + unit + subject to enrich the card back side.
    const schedules = await db.revisionSchedule.findMany({
      where: {
        userId: user.id,
        nextDueDate: { lte: endOfDay },
        topic: {
          status: 'active',
          archivedAt: null,
          unit: {
            status: 'active',
            archivedAt: null,
            subjectId: subjectId ?? { in: scopedSubjectIds },
          },
        },
      },
      include: {
        topic: {
          include: {
            unit: { include: { subject: { select: { id: true, name: true, accentColor: true, code: true } } } },
            lessons: {
              where: { reviseContent: { not: null } },
              select: { title: true, reviseContent: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { nextDueDate: 'asc' },
      take: limit,
    })

    // Pre-fetch attempt counts per schedule (in one query, not N+1).
    const scheduleIds = schedules.map((s) => s.id)
    const attemptCounts = await db.revisionAttempt.groupBy({
      by: ['scheduleId'],
      where: { scheduleId: { in: scheduleIds } },
      _count: true,
    })
    const attemptCountMap = new Map(attemptCounts.map((r) => [r.scheduleId, r._count]))

    const cards = schedules.map((s) => {
      const t = s.topic
      const subject = t.unit?.subject
      const lessonSnippet = t.lessons?.[0]?.reviseContent
      const todayMidnight = new Date(now)
      todayMidnight.setHours(0, 0, 0, 0)
      const daysOverdue = Math.max(
        0,
        Math.round((todayMidnight.getTime() - s.nextDueDate.getTime()) / 86_400_000),
      )

      // Card front: topic title. Card back: description + (if available) a
      // trimmed snippet of the lesson's reviseContent.
      const back = [t.description, lessonSnippet].filter(Boolean).join('\n\n').slice(0, 800)

      return {
        scheduleId: s.id,
        topicId: t.id,
        subjectId: subject?.id ?? null,
        subjectName: subject?.name ?? 'General',
        subjectCode: subject?.code ?? '',
        subjectAccent: subject?.accentColor ?? '#7c3aed',
        topicTitle: t.title,
        topicSlug: t.slug,
        topicDifficulty: t.difficulty,
        front: t.title,
        back: back || 'No additional notes available for this topic yet.',
        dueAt: s.nextDueDate.toISOString(),
        daysOverdue,
        easeFactor: s.easeFactor,
        intervalDays: s.intervalDays,
        state: s.state,
        attemptCount: attemptCountMap.get(s.id) ?? 0,
      }
    })

    return okResponse({ cards, totalDue: cards.length })
  })
}

// ============================================================
// POST — record an attempt + advance SM-2
// ============================================================
const PostSchema = z.object({
  scheduleId: z.string().min(1),
  quality: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
})

export async function POST(req: Request) {
  return withApi(async () => {
    const user = await requireUser()
    const body = PostSchema.safeParse(await req.json().catch(() => ({})))
    if (!body.success) {
      throw new ApiError('BAD_REQUEST', 'scheduleId and quality (0-5) are required.', 400, false)
    }
    const { scheduleId, quality } = body.data
    const scope = await getStudentLearningScope(user.id)
    if (!scope) {
      throw new ApiError('NOT_FOUND', 'Schedule not found.', 404, false)
    }

    // Load the schedule (ownership enforced by userId).
    const schedule = await db.revisionSchedule.findFirst({
      where: { id: scheduleId, userId: user.id, topic: scopedTopicWhere(scope) },
      include: { topic: { select: { title: true } } },
    })
    if (!schedule) {
      throw new ApiError('NOT_FOUND', 'Schedule not found.', 404, false)
    }

    // SM-2 algorithm — same as the existing revision/due POST handler.
    const q = quality
    const oldEase = schedule.easeFactor
    const oldInterval = schedule.intervalDays
    let newEase = oldEase
    let newInterval = oldInterval

    if (q < 3) {
      // Lapse — reset to 1 day.
      newInterval = 1
      newEase = Math.max(1.3, oldEase - 0.2)
    } else {
      // Pass — grow interval by ease factor.
      newInterval =
        oldInterval <= 1 ? (q >= 4 ? 3 : 2) : Math.round(oldInterval * oldEase)
      newEase = oldEase + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
      newEase = Math.max(1.3, Math.min(2.8, newEase))
    }

    // New state mapping: 0-2 = weak, 3 = revising, 4-5 = proficient (or mastered if interval > 21).
    const newState =
      q < 2 ? 'weak' : q === 2 ? 'learning' : newInterval > 21 ? 'mastered' : newInterval > 7 ? 'proficient' : 'revising'

    const nextDue = new Date()
    nextDue.setDate(nextDue.getDate() + newInterval)

    const updated = await db.revisionSchedule.update({
      where: { id: scheduleId },
      data: {
        intervalDays: newInterval,
        easeFactor: newEase,
        nextDueDate: nextDue,
        state: newState,
        activityType: 'flashcard',
      },
    })

    // Record the attempt.
    const attempt = await db.revisionAttempt.create({
      data: {
        userId: user.id,
        scheduleId,
        activityType: 'flashcard',
        correct: q >= 3,
        quality: q,
      },
    })

    // Award XP (idempotent per attempt).
    const xp = await awardXp({
      userId: user.id,
      eventType: 'revision',
      amount: 5,
      idempotencyKey: `flashcard:${attempt.id}`,
    })

    // Evaluate revision achievements (first_revision, revision_10, xp_*).
    const newlyUnlocked = await evaluateAchievements({
      userId: user.id,
      trigger: 'revision',
    })

    return okResponse({
      recorded: true,
      newIntervalDays: updated.intervalDays,
      newEaseFactor: updated.easeFactor,
      newState: updated.state,
      nextDueDate: updated.nextDueDate.toISOString(),
      xpAwarded: xp.awarded ? xp.amount : 0,
      totalXp: xp.totalXp,
      newlyUnlocked,
    })
  })
}

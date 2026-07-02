import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, withApi, okResponse, ApiError } from '@/lib/auth'
import { parseBody, autoPlanSchema } from '@/lib/schemas'
import {
  firstLessonReferenceForTopic,
  getStudentLearningScope,
  subjectIdsForLearningScope,
  topicIdsForLearningScope,
  type ScopedLessonReference,
} from '@/features/learning/server/get-student-learning-scope'

/**
 * POST /api/planner/auto
 *
 * Real planning engine — replaces the old fixed 7-day template.
 *
 * Loads actual user state (examDate, dailyMins), weak topics from
 * UserTopicMastery (state in 'weak'/'learning' OR score < 60), due
 * RevisionSchedule rows (nextDueDate <= now+7d), and existing StudyTask
 * rows for the next 14 days (for dedup).
 *
 * Generates a plan from TODAY until min(examDate, today+14 days). If no
 * examDate, defaults to 7 days. For each day:
 *   - revision tasks due that day (priority 1, ~20m each, max 3)
 *   - 1-2 weak-topic study blocks (priority 2, ~30m each)
 *   - every 3rd day: a practice block (priority 2, 45m) — every 6th day
 *     becomes a mock-exam block instead (priority 3, 90m)
 *   - a rest day after 6 consecutive study days
 *
 * Dedup guard: a draft whose (scheduledDate, title) already exists for
 * the user is skipped. With `regenerate:true`, the engine first deletes
 * all the user's future uncompleted tasks (completedAt == null AND
 * scheduledDate >= today) inside the same transaction, then inserts.
 *
 * SECURITY: every Prisma write uses ONLY explicitly validated fields.
 * No XP is awarded — planning is not a learning event.
 */
export async function POST(req: NextRequest) {
  return withApi(async () => {
    const authUser = await requireUser()
    const body = await parseBody(req, autoPlanSchema)

    // ---- Load real user data -------------------------------------------------
    const user = await db.user.findUnique({
      where: { id: authUser.id },
      select: { id: true, examDate: true, dailyMins: true },
    })
    if (!user) {
      throw new ApiError('NOT_FOUND', 'User profile not found.', 404, false)
    }
    const scope = await getStudentLearningScope(user.id)
    const scopedSubjectIds = subjectIdsForLearningScope(scope)
    const scopedTopicIds = topicIdsForLearningScope(scope)
    if (!scope || scopedSubjectIds.length === 0) {
      throw new ApiError('BAD_REQUEST', 'Learning scope is not available for planning.', 400, false)
    }

    const dailyMins = user.dailyMins && user.dailyMins > 0 ? user.dailyMins : 60

    // ---- Date range ----------------------------------------------------------
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = localDateStr(today)

    const maxDate = new Date(today)
    maxDate.setDate(today.getDate() + 14)

    let endDate: Date
    if (user.examDate) {
      const exam = new Date(user.examDate)
      if (!isNaN(exam.getTime())) {
        exam.setHours(0, 0, 0, 0)
        endDate = exam < maxDate ? exam : maxDate
        if (endDate < today) endDate = new Date(today) // exam already past — just today
      } else {
        // invalid examDate string — fall back to 7 days
        endDate = new Date(today)
        endDate.setDate(today.getDate() + 6)
      }
    } else {
      // no examDate — default 7 days inclusive
      endDate = new Date(today)
      endDate.setDate(today.getDate() + 6)
    }

    const totalDays = Math.max(
      1,
      Math.round((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) + 1,
    )

    // ---- Weak topics (mastery state weak/learning OR score < 60) -------------
    const weakMastery = await db.userTopicMastery.findMany({
      where: {
        userId: user.id,
        OR: [{ state: { in: ['weak', 'learning'] } }, { score: { lt: 60 } }],
        topic: {
          status: 'active',
          archivedAt: null,
          unit: {
            status: 'active',
            archivedAt: null,
            subjectId: { in: scopedSubjectIds },
          },
        },
      },
      include: {
        topic: {
          select: {
            id: true,
            title: true,
            unit: { select: { subjectId: true } },
          },
        },
      },
      orderBy: { score: 'asc' },
    })

    // ---- Due revision schedules (nextDueDate <= now+7d) ----------------------
    const sevenDaysAhead = new Date()
    sevenDaysAhead.setDate(sevenDaysAhead.getDate() + 7)
    const dueRevisions = await db.revisionSchedule.findMany({
      where: {
        userId: user.id,
        nextDueDate: { lte: sevenDaysAhead },
        topic: {
          status: 'active',
          archivedAt: null,
          unit: {
            status: 'active',
            archivedAt: null,
            subjectId: { in: scopedSubjectIds },
          },
        },
      },
      include: {
        topic: {
          select: {
            id: true,
            title: true,
            unit: { select: { subjectId: true } },
          },
        },
      },
      orderBy: { nextDueDate: 'asc' },
    })

    // Group revision schedules by their due-date YYYY-MM-DD.
    const revisionByDate = new Map<
      string,
      Array<{
        topicId: string
        topicTitle: string
        subjectId: string | null
        lesson: ScopedLessonReference | null
      }>
    >()
    for (const rev of dueRevisions) {
      const dStr = localDateStr(rev.nextDueDate)
      const bucket = revisionByDate.get(dStr) ?? []
      const lesson = firstLessonReferenceForTopic(scope, rev.topicId)
      bucket.push({
        topicId: rev.topicId,
        topicTitle: rev.topic.title,
        subjectId: lesson?.subjectId ?? rev.topic.unit?.subjectId ?? null,
        lesson,
      })
      revisionByDate.set(dStr, bucket)
    }

    // ---- Existing tasks for dedup (next 14 days) -----------------------------
    const existingTasks = await db.studyTask.findMany({
      where: {
        userId: user.id,
        scheduledDate: { gte: todayStr },
        OR: [
          { subjectId: { in: scopedSubjectIds } },
          { topicId: { in: scopedTopicIds } },
          { AND: [{ subjectId: null }, { topicId: null }] },
        ],
      },
      select: { scheduledDate: true, title: true, completedAt: true },
    })

    // In regenerate mode, uncompleted future tasks will be deleted inside the
    // transaction — so we only dedup against COMPLETED tasks in that case.
    // In non-regenerate mode, we dedup against all existing future tasks.
    const dedupKeys = new Set<string>()
    for (const t of existingTasks) {
      if (body.regenerate && t.completedAt === null) continue
      dedupKeys.add(`${t.scheduledDate}|${t.title}`)
    }

    // ---- Generate drafts -----------------------------------------------------
    type TaskType = 'study' | 'revision' | 'practice' | 'mock_exam' | 'rest'
    interface TaskDraft {
      title: string
      type: TaskType
      scheduledDate: string
      durationMins: number
      priority: number
      subjectId: string | null
      topicId: string | null
      lessonId: string | null
      canonicalUrl: string | null
      sourceReason: string | null
    }

    const drafts: TaskDraft[] = []
    let consecutiveStudyDays = 0
    let weakCursor = 0

    for (let i = 0; i < totalDays; i++) {
      const day = new Date(today)
      day.setDate(today.getDate() + i)
      const dateStr = localDateStr(day)

      // Rest-day rule: after 6 consecutive study days, today is a rest day.
      if (consecutiveStudyDays >= 6) {
        drafts.push({
          title: 'Rest Day — Recover & Recharge',
          type: 'rest',
          scheduledDate: dateStr,
          durationMins: 0,
          priority: 1,
          subjectId: null,
          topicId: null,
          lessonId: null,
          canonicalUrl: null,
          sourceReason: 'Inserted after six consecutive planned study days.',
        })
        consecutiveStudyDays = 0
        continue
      }

      let usedMins = 0
      const dayDrafts: TaskDraft[] = []

      // 1) Revision tasks due today (priority 1, ~20m, max 3).
      const todaysRev = revisionByDate.get(dateStr) ?? []
      for (const rev of todaysRev.slice(0, 3)) {
        if (usedMins + 20 > dailyMins) break
        dayDrafts.push({
          title: `Revise: ${rev.lesson?.title ?? rev.topicTitle}`,
          type: 'revision',
          scheduledDate: dateStr,
          durationMins: 20,
          priority: 1,
          subjectId: rev.subjectId,
          topicId: rev.lesson?.topicId ?? rev.topicId,
          lessonId: rev.lesson?.id ?? null,
          canonicalUrl: rev.lesson?.canonicalUrl ?? null,
          sourceReason: `Due revision schedule for ${rev.topicTitle}.`,
        })
        usedMins += 20
      }

      // 2) 1-2 weak-topic study blocks (priority 2, ~30m each).
      if (weakMastery.length > 0) {
        const weakCount = Math.min(2, weakMastery.length)
        for (let w = 0; w < weakCount; w++) {
          if (usedMins + 30 > dailyMins) break
          const wm = weakMastery[weakCursor % weakMastery.length]
          weakCursor++
          const lesson = firstLessonReferenceForTopic(scope, wm.topicId)
          const durationMins = Math.max(10, Math.min(lesson?.durationMin ?? 30, 45))
          if (usedMins + durationMins > dailyMins) break
          dayDrafts.push({
            title: `Study: ${lesson?.title ?? wm.topic.title}`,
            type: 'study',
            scheduledDate: dateStr,
            durationMins,
            priority: 2,
            subjectId: lesson?.subjectId ?? wm.topic.unit?.subjectId ?? null,
            topicId: lesson?.topicId ?? wm.topicId,
            lessonId: lesson?.id ?? null,
            canonicalUrl: lesson?.canonicalUrl ?? null,
            sourceReason: `Weak topic recovery for ${wm.topic.title} (mastery ${Math.round(wm.score)}%).`,
          })
          usedMins += durationMins
        }
      }

      // 3) Every 3rd day (i%3===0, i>0): practice block OR mock exam.
      //    Every 6th day becomes a full mock exam (priority 3, 90m);
      //    every other 3rd day is a practice set (priority 2, 45m).
      if (i > 0 && i % 3 === 0) {
        const isMock = i % 6 === 0
        const blockMins = isMock ? 90 : 45
        // Allow slight overflow for high-value exam blocks.
        if (usedMins + blockMins <= dailyMins + 30) {
          dayDrafts.push({
            title: isMock ? 'Mock Exam — Full Length' : 'Practice Set',
            type: isMock ? 'mock_exam' : 'practice',
            scheduledDate: dateStr,
            durationMins: blockMins,
            priority: isMock ? 3 : 2,
            subjectId: null,
            topicId: null,
            lessonId: null,
            canonicalUrl: null,
            sourceReason: isMock
              ? 'Scheduled as the every-sixth-day exam readiness checkpoint.'
              : 'Scheduled as the every-third-day practice checkpoint.',
          })
          usedMins += blockMins
        }
      }

      if (dayDrafts.length > 0) {
        consecutiveStudyDays++
        drafts.push(...dayDrafts)
      } else {
        // Nothing fit today (dailyMins very small) — reset streak.
        consecutiveStudyDays = 0
      }
    }

    // ---- Apply dedup ---------------------------------------------------------
    const toCreate = drafts.filter((d) => !dedupKeys.has(`${d.scheduledDate}|${d.title}`))
    const skipped = drafts.length - toCreate.length

    // ---- Transactional delete (regenerate) + bulk insert --------------------
    await db.$transaction(async (tx) => {
      if (body.regenerate) {
        await tx.studyTask.deleteMany({
          where: {
            userId: user.id,
            completedAt: null,
            scheduledDate: { gte: todayStr },
            OR: [
              { subjectId: { in: scopedSubjectIds } },
              { topicId: { in: scopedTopicIds } },
              { AND: [{ subjectId: null }, { topicId: null }] },
            ],
          },
        })
      }
      if (toCreate.length > 0) {
        await tx.studyTask.createMany({
          data: toCreate.map((d) => ({
            userId: user.id,
            title: d.title,
            type: d.type,
            subjectId: d.subjectId,
            topicId: d.topicId,
            lessonId: d.lessonId,
            canonicalUrl: d.canonicalUrl,
            sourceReason: d.sourceReason,
            durationMins: d.durationMins,
            scheduledDate: d.scheduledDate,
            priority: d.priority,
          })),
        })
      }
    })

    // ---- Return summary (including the planned drafts for client preview) ----
    return okResponse({
      created: toCreate.length,
      skipped,
      days: totalDays,
      tasks: toCreate.map((d) => ({
        title: d.title,
        type: d.type,
        scheduledDate: d.scheduledDate,
        durationMins: d.durationMins,
        priority: d.priority,
        subjectId: d.subjectId,
        topicId: d.topicId,
        lessonId: d.lessonId,
        canonicalUrl: d.canonicalUrl,
        sourceReason: d.sourceReason,
      })),
    })
  })
}

/**
 * Format a Date as a local YYYY-MM-DD string (NOT UTC).
 *
 * `Date.toISOString()` returns UTC, which can shift the calendar day for
 * non-UTC timezones (e.g. midnight IST → previous day 18:30 UTC). This
 * helper uses local getters so the calendar day is preserved.
 */
function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, withApi, okResponse, ApiError } from '@/lib/auth'
import { parseBody, createTaskSchema, updateTaskSchema } from '@/lib/schemas'
import { awardXp } from '@/lib/xp'
import { DEMO_TASKS, isDemoMode } from '@/lib/demo-fixtures'
import {
  findLessonReferenceInLearningScope,
  getStudentLearningScope,
  isSubjectIdInLearningScope,
  isLessonIdInLearningScope,
  isTopicIdInLearningScope,
  subjectIdForScopedTopic,
  subjectIdsForLearningScope,
  topicIdsForLearningScope,
  type StudentLearningScope,
} from '@/features/learning/server/get-student-learning-scope'

/**
 * GET /api/planner/task
 * Returns all study tasks for the current user.
 */
export async function GET() {
  return withApi(async () => {
    if (isDemoMode()) return okResponse(DEMO_TASKS)

    const user = await requireUser()
    const scope = await getStudentLearningScope(user.id)
    const scopedSubjectIds = subjectIdsForLearningScope(scope)
    const scopedTopicIds = topicIdsForLearningScope(scope)
    if (!scope || scopedSubjectIds.length === 0) return okResponse([])

    const tasks = await db.studyTask.findMany({
      where: {
        userId: user.id,
        OR: [
          { subjectId: null },
          { subjectId: { in: scopedSubjectIds } },
          { topicId: { in: scopedTopicIds } },
        ],
      },
      orderBy: [{ scheduledDate: 'asc' }, { priority: 'desc' }],
    })
    return okResponse(tasks.filter((task) => isTaskInLearningScope(scope, task)))
  })
}

/**
 * POST /api/planner/task
 * Creates a study task for the current user.
 *
 * SECURITY: data object is built from explicitly validated schema fields —
 * NEVER `{ userId: user.id, ...body }`, which would let the client override
 * userId (or any other field Prisma accepts).
 */
export async function POST(req: NextRequest) {
  return withApi(async () => {
    const user = await requireUser()
    const body = await parseBody(req, createTaskSchema)
    const scope = await getStudentLearningScope(user.id)
    assertTaskReferencesInLearningScope(scope, body, 'Task references unavailable curriculum.')
    const lesson = findLessonReferenceInLearningScope(scope, body.lessonId)
    const subjectId = body.subjectId ?? lesson?.subjectId ?? subjectIdForScopedTopic(scope, body.topicId) ?? undefined
    const topicId = body.topicId ?? lesson?.topicId ?? undefined

    const task = await db.studyTask.create({
      data: {
        userId: user.id,
        title: body.title,
        description: body.description,
        type: body.type ?? 'learn',
        subjectId,
        topicId,
        lessonId: lesson?.id,
        canonicalUrl: lesson?.canonicalUrl,
        sourceReason: lesson ? lessonSourceReason(lesson.title, lesson.unitNumber) : undefined,
        durationMins: body.durationMins ?? lesson?.durationMin ?? 30,
        scheduledDate: body.scheduledDate,
        scheduledTime: body.scheduledTime,
        priority: body.priority ?? 2,
      },
    })
    return okResponse(task)
  })
}

/**
 * PATCH /api/planner/task
 * Updates a study task owned by the current user. Ownership is enforced by
 * querying with `{ id, userId: user.id }` — a 404 is returned if not found
 * (don't leak existence to other users).
 *
 * XP awarded idempotently via ledger when the task transitions to completed.
 *
 * Query/body: { taskId, ...updateFields }
 */
export async function PATCH(req: NextRequest) {
  return withApi(async () => {
    const user = await requireUser()

    // Clone FIRST so we can read the body twice (peek for taskId, then parse).
    const cloned = req.clone()
    let rawBody: unknown
    try {
      rawBody = await req.json()
    } catch {
      throw new ApiError('BAD_REQUEST', 'Invalid request body.', 400, false)
    }
    if (
      typeof rawBody !== 'object' ||
      rawBody === null ||
      typeof (rawBody as Record<string, unknown>).taskId !== 'string'
    ) {
      throw new ApiError('BAD_REQUEST', 'taskId is required.', 400, false)
    }
    const taskId = (rawBody as Record<string, unknown>).taskId as string
    const body = await parseBody(cloned, updateTaskSchema)

    // Verify ownership before applying any update — never trust the body's id.
    const existing = await db.studyTask.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        userId: true,
        completed: true,
        completedAt: true,
        subjectId: true,
        topicId: true,
        lessonId: true,
      },
    })
    if (!existing || existing.userId !== user.id) {
      throw new ApiError('NOT_FOUND', 'Task not found.', 404, false)
    }
    const scope = await getStudentLearningScope(user.id)
    if (!isTaskInLearningScope(scope, existing)) {
      throw new ApiError('NOT_FOUND', 'Task not found.', 404, false)
    }
    const nextReferences = {
      subjectId: body.subjectId !== undefined ? body.subjectId : existing.subjectId,
      topicId: body.topicId !== undefined ? body.topicId : existing.topicId,
      lessonId: body.lessonId !== undefined ? body.lessonId : existing.lessonId,
    }
    assertTaskReferencesInLearningScope(scope, nextReferences, 'Task references unavailable curriculum.')
    const nextLesson = findLessonReferenceInLearningScope(scope, nextReferences.lessonId)

    const wasCompleted = existing.completed
    const nowCompleted = body.completed === true

    const data: Record<string, unknown> = {}
    if (body.title !== undefined) data.title = body.title
    if (body.description !== undefined) data.description = body.description
    if (body.type !== undefined) data.type = body.type
    if (body.subjectId !== undefined) data.subjectId = body.subjectId
    if (body.topicId !== undefined) data.topicId = body.topicId
    if (body.lessonId !== undefined) {
      data.lessonId = nextLesson?.id ?? null
      data.canonicalUrl = nextLesson?.canonicalUrl ?? null
      data.sourceReason = nextLesson ? lessonSourceReason(nextLesson.title, nextLesson.unitNumber) : null
    }
    if (body.subjectId === undefined && body.lessonId !== undefined && nextLesson) {
      data.subjectId = nextLesson.subjectId
    }
    if (body.topicId === undefined && body.lessonId !== undefined && nextLesson) {
      data.topicId = nextLesson.topicId
    }
    if (body.subjectId === undefined && body.topicId !== undefined && body.topicId) {
      data.subjectId = subjectIdForScopedTopic(scope, body.topicId)
    }
    if (body.durationMins !== undefined) data.durationMins = body.durationMins
    if (body.scheduledDate !== undefined) data.scheduledDate = body.scheduledDate
    if (body.scheduledTime !== undefined) data.scheduledTime = body.scheduledTime
    if (body.priority !== undefined) data.priority = body.priority
    if (body.completed !== undefined) {
      data.completed = body.completed
      data.completedAt = body.completed ? new Date() : null
    }

    const task = await db.studyTask.update({ where: { id: taskId }, data })

    // Award XP idempotently when transitioning not-completed → completed.
    let xpGain = 0
    if (nowCompleted && !wasCompleted) {
      const xp = await awardXp({
        userId: user.id,
        eventType: 'lesson_complete', // re-using a study-completion event type
        amount: 15,
        idempotencyKey: `task_complete:${taskId}`,
        sourceId: taskId,
      })
      xpGain = xp.awarded ? xp.amount : 0
    }

    // Re-read authoritative total.
    const finalUser = await db.user.findUnique({
      where: { id: user.id },
      select: { xp: true },
    })

    return okResponse({ ...task, xpGain, totalXp: finalUser?.xp ?? 0 })
  })
}

/**
 * DELETE /api/planner/task?taskId=...
 * Deletes a study task owned by the current user. Ownership enforced via
 * `{ id, userId: user.id }`; 404 if not found.
 */
export async function DELETE(req: NextRequest) {
  return withApi(async () => {
    const user = await requireUser()
    const sp = req.nextUrl.searchParams
    const taskId = sp.get('taskId')
    if (!taskId) {
      throw new ApiError('BAD_REQUEST', 'taskId is required.', 400, false)
    }
    const scope = await getStudentLearningScope(user.id)
    const existing = await db.studyTask.findFirst({
      where: { id: taskId, userId: user.id },
      select: { id: true, subjectId: true, topicId: true, lessonId: true },
    })
    if (!existing || !isTaskInLearningScope(scope, existing)) {
      throw new ApiError('NOT_FOUND', 'Task not found.', 404, false)
    }
    await db.studyTask.delete({ where: { id: taskId } })
    return okResponse({ deleted: true })
  })
}

function isTaskInLearningScope(
  scope: StudentLearningScope | null | undefined,
  task: { subjectId: string | null; topicId: string | null; lessonId?: string | null },
): boolean {
  if (!scope) return false
  if (!task.subjectId && !task.topicId && !task.lessonId) return true
  if (task.lessonId) {
    const lesson = findLessonReferenceInLearningScope(scope, task.lessonId)
    if (!lesson) return false
    if (task.subjectId && task.subjectId !== lesson.subjectId) return false
    if (task.topicId && task.topicId !== lesson.topicId) return false
  }
  if (task.subjectId && !isSubjectIdInLearningScope(scope, task.subjectId)) return false
  if (task.topicId && !isTopicIdInLearningScope(scope, task.topicId)) return false
  if (task.lessonId && !isLessonIdInLearningScope(scope, task.lessonId)) return false
  const topicSubjectId = subjectIdForScopedTopic(scope, task.topicId)
  return !task.subjectId || !topicSubjectId || task.subjectId === topicSubjectId
}

function assertTaskReferencesInLearningScope(
  scope: StudentLearningScope | null | undefined,
  task: { subjectId?: string | null; topicId?: string | null; lessonId?: string | null },
  message: string,
) {
  if (!scope || !isTaskInLearningScope(scope, {
    subjectId: task.subjectId ?? null,
    topicId: task.topicId ?? null,
    lessonId: task.lessonId ?? null,
  })) {
    throw new ApiError('BAD_REQUEST', message, 400, false)
  }
}

function lessonSourceReason(title: string, unitNumber: number): string {
  return `Linked to lesson "${title}" from Unit ${unitNumber}.`
}

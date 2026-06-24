import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, withApi, okResponse, ApiError } from '@/lib/auth'
import { parseBody, createTaskSchema, updateTaskSchema } from '@/lib/schemas'
import { awardXp } from '@/lib/xp'
import { DEMO_TASKS, isDemoMode } from '@/lib/demo-fixtures'

/**
 * GET /api/planner/task
 * Returns all study tasks for the current user.
 */
export async function GET() {
  return withApi(async () => {
    if (isDemoMode()) return okResponse(DEMO_TASKS)

    const user = await requireUser()
    const tasks = await db.studyTask.findMany({
      where: { userId: user.id },
      orderBy: [{ scheduledDate: 'asc' }, { priority: 'desc' }],
    })
    return okResponse(tasks)
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

    const task = await db.studyTask.create({
      data: {
        userId: user.id,
        title: body.title,
        description: body.description,
        type: body.type ?? 'learn',
        subjectId: body.subjectId,
        topicId: body.topicId,
        durationMins: body.durationMins ?? 30,
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
      select: { id: true, userId: true, completed: true, completedAt: true },
    })
    if (!existing || existing.userId !== user.id) {
      throw new ApiError('NOT_FOUND', 'Task not found.', 404, false)
    }

    const wasCompleted = existing.completed
    const nowCompleted = body.completed === true

    const data: Record<string, unknown> = {}
    if (body.title !== undefined) data.title = body.title
    if (body.description !== undefined) data.description = body.description
    if (body.type !== undefined) data.type = body.type
    if (body.subjectId !== undefined) data.subjectId = body.subjectId
    if (body.topicId !== undefined) data.topicId = body.topicId
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
    // Use deleteMany with the ownership filter so we don't leak existence
    // (returns count=0 if the task belongs to another user or doesn't exist).
    const result = await db.studyTask.deleteMany({
      where: { id: taskId, userId: user.id },
    })
    if (result.count === 0) {
      throw new ApiError('NOT_FOUND', 'Task not found.', 404, false)
    }
    return okResponse({ deleted: true })
  })
}

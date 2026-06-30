import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, withApi, okResponse, ApiError } from '@/lib/auth'
import {
  parseBody,
  createTutorSessionSchema,
  updateTutorSessionSchema,
} from '@/lib/schemas'
import { DEMO_TUTOR_SESSIONS, isDemoMode } from '@/lib/demo-fixtures'
import {
  findScopedTopic,
  findScopedUnit,
  getStudentLearningScope,
  isSubjectIdInLearningScope,
} from '@/features/learning/server/get-student-learning-scope'

const safeMessageSelect = {
  id: true,
  role: true,
  content: true,
  mode: true,
  groundingStatus: true,
  citations: true,
  followUps: true,
  feedback: true,
  createdAt: true,
} as const

const safeSessionSelect = {
  id: true,
  title: true,
  subjectId: true,
  unitNumber: true,
  topicId: true,
  mode: true,
  language: true,
  archived: true,
  createdAt: true,
  updatedAt: true,
  messages: {
    orderBy: { createdAt: 'asc' as const },
    select: safeMessageSelect,
  },
} as const

/** Lists the current user's tutor sessions. */
export async function GET(req: NextRequest) {
  return withApi(async () => {
    if (isDemoMode()) return okResponse(DEMO_TUTOR_SESSIONS)

    const user = await requireUser()
    const includeArchived = req.nextUrl.searchParams.get('archived') === 'true'

    const sessions = await db.tutorSession.findMany({
      where: {
        userId: user.id,
        archived: includeArchived ? undefined : false,
      },
      select: safeSessionSelect,
      orderBy: { updatedAt: 'desc' },
    })
    return okResponse(sessions)
  })
}

/** Creates a new tutor session. */
export async function POST(req: NextRequest) {
  return withApi(async () => {
    const body = await parseBody(req, createTutorSessionSchema)
    if (isDemoMode()) {
      const now = new Date().toISOString()
      return okResponse({
        id: `demo-session-${Date.now()}`,
        title: body.title ?? 'New session',
        subjectId: body.subjectId,
        unitNumber: body.unitNumber,
        topicId: body.topicId,
        mode: body.mode ?? 'explain_simple',
        language: body.language ?? 'en',
        archived: false,
        createdAt: now,
        updatedAt: now,
        messages: [],
      })
    }

    const user = await requireUser()
    const learningScope = await getStudentLearningScope(user.id)
    if (body.subjectId && !isSubjectIdInLearningScope(learningScope, body.subjectId)) {
      throw new ApiError('NOT_FOUND', 'Subject not found.', 404, false)
    }
    if (body.unitNumber && !body.subjectId) {
      throw new ApiError('VALIDATION_ERROR', 'Select a subject before selecting a unit.', 400, false)
    }
    if (body.subjectId && body.unitNumber) {
      const unit = await findScopedUnit(learningScope!, {
        subjectId: body.subjectId,
        unitNumber: body.unitNumber,
      })
      if (!unit) {
        throw new ApiError('NOT_FOUND', 'Unit not found.', 404, false)
      }
    }
    if (body.topicId) {
      const topic = await findScopedTopic(learningScope!, {
        topicId: body.topicId,
        subjectId: body.subjectId ?? null,
        unitNumber: body.unitNumber ?? null,
      })
      if (!topic) {
        throw new ApiError('NOT_FOUND', 'Topic not found.', 404, false)
      }
    }

    const session = await db.tutorSession.create({
      data: {
        userId: user.id,
        title: body.title ?? 'New session',
        subjectId: body.subjectId,
        unitNumber: body.unitNumber,
        topicId: body.topicId,
        mode: body.mode ?? 'explain_simple',
        language: body.language ?? 'en',
      },
      select: safeSessionSelect,
    })
    return okResponse(session)
  })
}

/** Updates a tutor session owned by the current user. */
export async function PATCH(req: NextRequest) {
  return withApi(async () => {
    if (isDemoMode()) return okResponse({ updated: true, demo: true })

    const user = await requireUser()
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
      typeof (rawBody as Record<string, unknown>).sessionId !== 'string'
    ) {
      throw new ApiError('BAD_REQUEST', 'sessionId is required.', 400, false)
    }

    const sessionId = (rawBody as Record<string, unknown>).sessionId as string
    const body = await parseBody(cloned, updateTutorSessionSchema)
    const existing = await db.tutorSession.findUnique({
      where: { id: sessionId },
      select: { id: true, userId: true },
    })
    if (!existing || existing.userId !== user.id) {
      throw new ApiError('NOT_FOUND', 'Session not found.', 404, false)
    }

    const data: Record<string, unknown> = {}
    if (body.title !== undefined) data.title = body.title
    if (body.mode !== undefined) data.mode = body.mode
    if (body.language !== undefined) data.language = body.language
    if (body.archived !== undefined) data.archived = body.archived

    const session = await db.tutorSession.update({
      where: { id: sessionId },
      data,
      select: safeSessionSelect,
    })
    return okResponse(session)
  })
}

/** Deletes a tutor session owned by the current user. */
export async function DELETE(req: NextRequest) {
  return withApi(async () => {
    if (isDemoMode()) return okResponse({ deleted: true, demo: true })

    const user = await requireUser()
    const sessionId = req.nextUrl.searchParams.get('sessionId')
    if (!sessionId) {
      throw new ApiError('BAD_REQUEST', 'sessionId is required.', 400, false)
    }

    const existing = await db.tutorSession.findUnique({
      where: { id: sessionId },
      select: { id: true, userId: true },
    })
    if (!existing || existing.userId !== user.id) {
      throw new ApiError('NOT_FOUND', 'Session not found.', 404, false)
    }

    await db.$transaction([
      db.tutorMessage.deleteMany({ where: { sessionId } }),
      db.tutorSession.delete({ where: { id: sessionId } }),
    ])
    return okResponse({ deleted: true })
  })
}

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, withApi, okResponse, ApiError } from '@/lib/auth'
import {
  parseBody,
  createTutorSessionSchema,
  updateTutorSessionSchema,
} from '@/lib/schemas'
import { DEMO_TUTOR_SESSIONS, isDemoMode } from '@/lib/demo-fixtures'

/**
 * GET /api/tutor/session
 * Lists the current user's tutor sessions.
 * Query: ?archived=true to include archived sessions.
 */
export async function GET(req: NextRequest) {
  return withApi(async () => {
    if (isDemoMode()) return okResponse(DEMO_TUTOR_SESSIONS)

    const user = await requireUser()
    const sp = req.nextUrl.searchParams
    const includeArchived = sp.get('archived') === 'true'

    const sessions = await db.tutorSession.findMany({
      where: {
        userId: user.id,
        archived: includeArchived ? undefined : false,
      },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
    })
    return okResponse(sessions)
  })
}

/**
 * POST /api/tutor/session
 * Creates a new tutor session. Field whitelist via Zod.
 */
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
      include: { messages: true },
    })
    return okResponse(session)
  })
}

/**
 * PATCH /api/tutor/session
 * Updates a tutor session owned by the current user. Ownership is enforced
 * by querying with `{ id, userId: user.id }` — 404 if not found.
 *
 * Body: { sessionId, ...updateFields }
 */
export async function PATCH(req: NextRequest) {
  return withApi(async () => {
    if (isDemoMode()) {
      return okResponse({ updated: true, demo: true })
    }

    const user = await requireUser()

    // Clone FIRST so we can read the body twice (peek for sessionId, then parse).
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

    // Ownership check (use findFirst so we can 404 cleanly without leaking).
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
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    })
    return okResponse(session)
  })
}

/**
 * DELETE /api/tutor/session?sessionId=...
 * Deletes a tutor session owned by the current user.
 */
export async function DELETE(req: NextRequest) {
  return withApi(async () => {
    if (isDemoMode()) return okResponse({ deleted: true, demo: true })

    const user = await requireUser()
    const sp = req.nextUrl.searchParams
    const sessionId = sp.get('sessionId')
    if (!sessionId) {
      throw new ApiError('BAD_REQUEST', 'sessionId is required.', 400, false)
    }

    // Enforce ownership via the where clause.
    const existing = await db.tutorSession.findUnique({
      where: { id: sessionId },
      select: { id: true, userId: true },
    })
    if (!existing || existing.userId !== user.id) {
      throw new ApiError('NOT_FOUND', 'Session not found.', 404, false)
    }

    await db.tutorMessage.deleteMany({ where: { sessionId } })
    await db.tutorSession.delete({ where: { id: sessionId } })
    return okResponse({ deleted: true })
  })
}

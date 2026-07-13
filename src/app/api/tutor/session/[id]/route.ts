import { NextRequest } from 'next/server'
import { requireUser, withApi, okResponse, ApiError } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  resumeSession,
  renameSession,
  archiveSession,
  deleteSession,
} from '@/lib/ai/memory/manager'

export const runtime = 'nodejs'

interface RouteParams {
  id: string
}

interface SessionOwnershipRow {
  id: string
  userId: string
  title: string
  archived: boolean
}

/**
 * Verify the session exists and belongs to the current user. Returns the
 * session row (narrowed to the four fields we select) or throws an ApiError
 * (404) when missing / forbidden.
 */
async function verifySessionOwnership(
  sessionId: string,
  userId: string,
): Promise<SessionOwnershipRow> {
  const session = await db.tutorSession.findFirst({
    where: { id: sessionId, userId },
    select: { id: true, userId: true, title: true, archived: true },
  })
  if (!session) {
    throw new ApiError('NOT_FOUND', 'Session not found.', 404, false)
  }
  return session
}

/** Resume a session — returns session + messages + memories + summaries. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<RouteParams> },
) {
  return withApi(async () => {
    const user = await requireUser()
    const { id: sessionId } = await params
    // Ownership check first — gives a clean 404 for unknown / foreign sessions
    // even if `resumeSession` would have returned null anyway.
    await verifySessionOwnership(sessionId, user.id)
    const bundle = await resumeSession(user.id, sessionId)
    if (!bundle) {
      throw new ApiError('NOT_FOUND', 'Session not found.', 404, false)
    }
    return okResponse(bundle)
  })
}

interface PatchBody {
  title?: string
  archived?: boolean
}

/** Rename and/or archive (or unarchive) a session. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<RouteParams> },
) {
  return withApi(async () => {
    const user = await requireUser()
    const { id: sessionId } = await params
    await verifySessionOwnership(sessionId, user.id)

    let body: PatchBody
    try {
      body = (await req.json()) as PatchBody
    } catch {
      throw new ApiError('BAD_REQUEST', 'Invalid request body.', 400, false)
    }

    const hasTitle = typeof body.title === 'string' && body.title.trim().length > 0
    const hasArchived = typeof body.archived === 'boolean'

    if (!hasTitle && !hasArchived) {
      throw new ApiError(
        'BAD_REQUEST',
        'Provide a "title" and/or "archived" field to update.',
        400,
        false,
      )
    }

    if (hasTitle) {
      await renameSession(sessionId, body.title as string)
    }
    if (hasArchived) {
      await archiveSession(sessionId, body.archived as boolean)
    }

    const fresh = await db.tutorSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        title: true,
        archived: true,
        updatedAt: true,
      },
    })
    return okResponse({ session: fresh })
  })
}

/** Hard-delete a session and all of its data. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<RouteParams> },
) {
  return withApi(async () => {
    const user = await requireUser()
    const { id: sessionId } = await params
    await verifySessionOwnership(sessionId, user.id)
    await deleteSession(sessionId)
    return okResponse({ deleted: true })
  })
}

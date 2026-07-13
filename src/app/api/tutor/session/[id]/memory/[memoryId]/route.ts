import { NextRequest } from 'next/server'
import { requireUser, withApi, okResponse, ApiError } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  deactivateMemory,
  updateMemoryImportance,
} from '@/lib/ai/memory/store'

export const runtime = 'nodejs'

interface RouteParams {
  id: string
  memoryId: string
}

/**
 * Verify the memory belongs to a session owned by the current user. Returns
 * the memory row or throws an ApiError (404) when missing / forbidden.
 */
async function verifyMemoryOwnership(
  sessionId: string,
  memoryId: string,
  userId: string,
): Promise<void> {
  // Verify session ownership first.
  const session = await db.tutorSession.findFirst({
    where: { id: sessionId, userId },
    select: { id: true },
  })
  if (!session) {
    throw new ApiError('NOT_FOUND', 'Session not found.', 404, false)
  }
  // Then verify the memory actually belongs to that session.
  const memory = await db.tutorMemory.findFirst({
    where: { id: memoryId, sessionId },
    select: { id: true },
  })
  if (!memory) {
    throw new ApiError('NOT_FOUND', 'Memory not found.', 404, false)
  }
}

/** Soft-delete a memory (sets active = false). */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<RouteParams> },
) {
  return withApi(async () => {
    const user = await requireUser()
    const { id: sessionId, memoryId } = await params
    await verifyMemoryOwnership(sessionId, memoryId, user.id)
    await deactivateMemory(memoryId)
    return okResponse({ deactivated: true })
  })
}

interface PatchBody {
  importance?: unknown
}

/** Update the importance (1–5) of a memory. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<RouteParams> },
) {
  return withApi(async () => {
    const user = await requireUser()
    const { id: sessionId, memoryId } = await params
    await verifyMemoryOwnership(sessionId, memoryId, user.id)

    let body: PatchBody
    try {
      body = (await req.json()) as PatchBody
    } catch {
      throw new ApiError('BAD_REQUEST', 'Invalid request body.', 400, false)
    }

    const importance = Number(body.importance)
    if (!Number.isFinite(importance)) {
      throw new ApiError(
        'BAD_REQUEST',
        'A numeric "importance" field (1-5) is required.',
        400,
        false,
      )
    }

    // `updateMemoryImportance` clamps to 1-5 internally, but we surface a 400
    // when the value is wildly out of range so callers can fix their input.
    if (importance < 1 || importance > 5) {
      throw new ApiError(
        'BAD_REQUEST',
        'Importance must be between 1 and 5.',
        400,
        false,
      )
    }

    await updateMemoryImportance(memoryId, importance)
    return okResponse({ updated: true })
  })
}

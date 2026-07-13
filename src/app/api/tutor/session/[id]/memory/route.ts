import { NextRequest } from 'next/server'
import { requireUser, withApi, okResponse, ApiError } from '@/lib/auth'
import { db } from '@/lib/db'
import { getActiveMemories } from '@/lib/ai/memory/store'

export const runtime = 'nodejs'

interface RouteParams {
  id: string
}

/** Returns all active memories for a session (must belong to the caller). */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<RouteParams> },
) {
  return withApi(async () => {
    const user = await requireUser()
    const { id: sessionId } = await params

    const session = await db.tutorSession.findFirst({
      where: { id: sessionId, userId: user.id },
      select: { id: true },
    })
    if (!session) {
      throw new ApiError('NOT_FOUND', 'Session not found.', 404, false)
    }

    const memories = await getActiveMemories(sessionId)
    return okResponse({ memories })
  })
}

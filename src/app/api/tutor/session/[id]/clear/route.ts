import { NextRequest } from 'next/server'
import { requireUser, withApi, okResponse, ApiError } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  clearSessionMemory,
  clearAllSessionData,
} from '@/lib/ai/memory/manager'

export const runtime = 'nodejs'

interface RouteParams {
  id: string
}

/**
 * Clear a session's accumulated memory.
 *
 * Default (`DELETE /session/[id]/clear`) — deletes memories and summaries but
 * keeps the message history (the conversation transcript is preserved so the
 * user can still read what was said; only "what LEO remembers" is reset).
 *
 * `DELETE /session/[id]/clear?full=true` — also wipes the message history.
 * Useful as a "fresh start" without deleting the session row itself.
 */
export async function DELETE(
  req: NextRequest,
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

    const url = new URL(req.url)
    const full = url.searchParams.get('full') === 'true'

    if (full) {
      await clearAllSessionData(sessionId)
      return okResponse({ cleared: true, full: true })
    }

    await clearSessionMemory(sessionId)
    return okResponse({ cleared: true, full: false })
  })
}

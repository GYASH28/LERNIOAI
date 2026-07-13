import { NextRequest } from 'next/server'
import { requireUser, withApi, ApiError } from '@/lib/auth'
import { db } from '@/lib/db'
import { exportConversation } from '@/lib/ai/memory/manager'

export const runtime = 'nodejs'

interface RouteParams {
  id: string
}

/**
 * Export a session's full conversation (session metadata, messages, memories,
 * and summaries) as a downloadable JSON file. The `Content-Disposition` header
 * nudges browsers to save the response as `lernio-conversation.json`.
 */
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

    const exported = await exportConversation(sessionId)
    if (!exported) {
      throw new ApiError('NOT_FOUND', 'Session not found.', 404, false)
    }

    const body = JSON.stringify(exported, null, 2)
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': 'attachment; filename="lernio-conversation.json"',
        'Cache-Control': 'no-store',
      },
    })
  })
}

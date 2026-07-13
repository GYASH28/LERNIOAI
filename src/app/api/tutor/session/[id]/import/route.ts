import { NextRequest } from 'next/server'
import { requireUser, withApi, okResponse, ApiError } from '@/lib/auth'
import { importConversation } from '@/lib/ai/memory/manager'

export const runtime = 'nodejs'

interface RouteParams {
  id: string
}

interface ImportedMessage {
  role: string
  content: string
}

interface ImportBody {
  title?: unknown
  messages?: unknown
}

/**
 * Import a conversation into a brand-new session owned by the current user.
 * The `id` path parameter is ignored (a new session is always created) — the
 * route lives under `/session/[id]/import` purely for client-side symmetry with
 * the export endpoint.
 *
 * Body: `{ title?: string; messages: Array<{ role: string; content: string }> }`
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<RouteParams> },
) {
  return withApi(async () => {
    // `id` is unused — kept in the signature so the route matches the URL shape
    // requested by the task. Awaiting the promise satisfies Next.js 16's
    // dynamic-params contract.
    await params

    const user = await requireUser()

    let body: ImportBody
    try {
      body = (await req.json()) as ImportBody
    } catch {
      throw new ApiError('BAD_REQUEST', 'Invalid request body.', 400, false)
    }

    if (!Array.isArray(body.messages)) {
      throw new ApiError(
        'BAD_REQUEST',
        'A "messages" array is required.',
        400,
        false,
      )
    }

    const messages: ImportedMessage[] = []
    for (const raw of body.messages) {
      if (!raw || typeof raw !== 'object') {
        throw new ApiError(
          'BAD_REQUEST',
          'Each message must be an object with "role" and "content".',
          400,
          false,
        )
      }
      const message = raw as Record<string, unknown>
      if (
        typeof message.role !== 'string' ||
        typeof message.content !== 'string' ||
        message.content.length === 0
      ) {
        throw new ApiError(
          'BAD_REQUEST',
          'Each message must have a string "role" and a non-empty string "content".',
          400,
          false,
        )
      }
      messages.push({ role: message.role, content: message.content })
    }

    if (messages.length === 0) {
      throw new ApiError(
        'BAD_REQUEST',
        'Cannot import a conversation with no messages.',
        400,
        false,
      )
    }

    const title =
      typeof body.title === 'string' && body.title.trim().length > 0
        ? body.title
        : undefined

    const result = await importConversation(user.id, { title, messages })
    if (!result) {
      throw new ApiError(
        'INTERNAL_ERROR',
        'Failed to import conversation. Please try again.',
        500,
        true,
      )
    }

    return okResponse({ sessionId: result.sessionId })
  })
}

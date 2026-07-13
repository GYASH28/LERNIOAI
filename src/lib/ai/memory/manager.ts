import 'server-only'

// ---------------------------------------------------------------------------
// Conversation Memory System — session manager.
//
// High-level utilities for creating / resuming / archiving / deleting tutor
// sessions, plus import / export helpers. All functions are defensive: DB
// errors are logged and translated into safe defaults (null, empty arrays,
// no-ops) so callers never crash.
// ---------------------------------------------------------------------------

import type { TutorSession as PrismaTutorSession } from '@prisma/client'

import { db } from '@/lib/db'
import {
  getActiveMemories,
  getSummaries,
} from '@/lib/ai/memory/store'
import type {
  ConversationMemory,
  SessionSummary,
} from '@/lib/ai/memory/types'

// ---------------------------------------------------------------------------
// Create / resume
// ---------------------------------------------------------------------------

/**
 * Create a new tutor session for the given user.
 *
 * @param userId - Owning user ID.
 * @param opts   - Optional `{ title, mode, subjectId }`. Defaults: title "New session", mode "explain_simple".
 * @returns The new session's `{ id }`, or `null` on failure.
 */
export async function createSession(
  userId: string,
  opts?: { title?: string; mode?: string; subjectId?: string },
): Promise<{ id: string } | null> {
  if (!userId) return null
  try {
    const session = await db.tutorSession.create({
      data: {
        userId,
        title: (opts?.title?.trim() || 'New session').slice(0, 200),
        mode: opts?.mode?.trim() || 'explain_simple',
        ...(opts?.subjectId ? { subjectId: opts.subjectId } : {}),
      },
    })
    return { id: session.id }
  } catch (error) {
    console.error('[memory:manager] createSession failed:', errorSummary(error))
    return null
  }
}

/**
 * Resume a session — fetch the session row, its messages, active memories, and
 * summaries in one go. Returns `null` when the session does not exist or does
 * not belong to `userId`.
 *
 * @param userId    - Owning user ID (used for ownership check).
 * @param sessionId - Session to resume.
 * @returns The session bundle, or `null` on failure / not-found / forbidden.
 */
export async function resumeSession(
  userId: string,
  sessionId: string,
): Promise<{
  session: PrismaTutorSession
  messages: Array<{ role: string; content: string; createdAt: Date }>
  memories: ConversationMemory[]
  summaries: SessionSummary[]
} | null> {
  if (!userId || !sessionId) return null
  try {
    const session = await db.tutorSession.findUnique({
      where: { id: sessionId },
    })
    if (!session || session.userId !== userId) return null

    const [messageRows, memories, summaries] = await Promise.all([
      db.tutorMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
        select: { role: true, content: true, createdAt: true },
      }),
      getActiveMemories(sessionId),
      getSummaries(sessionId),
    ])

    return {
      session,
      messages: messageRows.map((row) => ({
        role: row.role,
        content: row.content,
        createdAt: row.createdAt,
      })),
      memories,
      summaries,
    }
  } catch (error) {
    console.error('[memory:manager] resumeSession failed:', errorSummary(error))
    return null
  }
}

// ---------------------------------------------------------------------------
// Reset / clear
// ---------------------------------------------------------------------------

/**
 * Delete all memories and summaries for a session but keep the message
 * history. Useful when the user wants to "forget what LEO knows" without
 * losing the conversation.
 *
 * @param sessionId - Session to clear.
 */
export async function clearSessionMemory(sessionId: string): Promise<void> {
  if (!sessionId) return
  try {
    await db.$transaction([
      db.tutorMemory.deleteMany({ where: { sessionId } }),
      db.tutorSessionSummary.deleteMany({ where: { sessionId } }),
    ])
  } catch (error) {
    console.error('[memory:manager] clearSessionMemory failed:', errorSummary(error))
  }
}

/**
 * Full reset — delete messages, memories, and summaries for a session. The
 * session row itself is retained (call `deleteSession` to remove it too).
 *
 * @param sessionId - Session to clear.
 */
export async function clearAllSessionData(sessionId: string): Promise<void> {
  if (!sessionId) return
  try {
    await db.$transaction([
      db.tutorMessage.deleteMany({ where: { sessionId } }),
      db.tutorMemory.deleteMany({ where: { sessionId } }),
      db.tutorSessionSummary.deleteMany({ where: { sessionId } }),
    ])
  } catch (error) {
    console.error('[memory:manager] clearAllSessionData failed:', errorSummary(error))
  }
}

// ---------------------------------------------------------------------------
// Import / export
// ---------------------------------------------------------------------------

/**
 * Export a session and its full conversation as a plain JSON-serialisable
 * object. Memories and summaries are included so the conversation can be
 * re-imported with its accumulated context intact.
 *
 * @param sessionId - Session to export.
 * @returns The exported bundle, or `null` when the session does not exist.
 */
export async function exportConversation(
  sessionId: string,
): Promise<{
  session: { title: string; createdAt: string }
  messages: Array<{ role: string; content: string; createdAt: string }>
  memories: ConversationMemory[]
  summaries: SessionSummary[]
} | null> {
  if (!sessionId) return null
  try {
    const session = await db.tutorSession.findUnique({
      where: { id: sessionId },
      select: { title: true, createdAt: true },
    })
    if (!session) return null

    const [messages, memories, summaries] = await Promise.all([
      db.tutorMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
        select: { role: true, content: true, createdAt: true },
      }),
      getActiveMemories(sessionId),
      getSummaries(sessionId),
    ])

    return {
      session: {
        title: session.title,
        createdAt: session.createdAt.toISOString(),
      },
      messages: messages.map((row) => ({
        role: row.role,
        content: row.content,
        createdAt: row.createdAt.toISOString(),
      })),
      memories,
      summaries,
    }
  } catch (error) {
    console.error('[memory:manager] exportConversation failed:', errorSummary(error))
    return null
  }
}

/**
 * Import a conversation into a brand-new session for the given user. Messages
 * are bulk-inserted in chronological order. Memories and summaries are NOT
 * imported (the new session will re-extract its own memories from the
 * imported messages as the user continues chatting).
 *
 * @param userId - Owning user ID for the new session.
 * @param data   - `{ title?, messages: [{ role, content }] }`.
 * @returns The new session's `{ sessionId }`, or `null` on failure.
 */
export async function importConversation(
  userId: string,
  data: { title?: string; messages: Array<{ role: string; content: string }> },
): Promise<{ sessionId: string } | null> {
  if (!userId) return null
  if (!data || !Array.isArray(data.messages)) return null

  try {
    const session = await db.tutorSession.create({
      data: {
        userId,
        title: (data.title?.trim() || 'Imported session').slice(0, 200),
        mode: 'explain_simple',
      },
    })

    if (data.messages.length > 0) {
      const now = new Date()
      await db.tutorMessage.createMany({
        data: data.messages
          .filter((message) => message && message.content && message.role)
          .map((message, index) => ({
            sessionId: session.id,
            role: message.role === 'assistant' ? 'assistant' : 'user',
            content: String(message.content),
            clientMessageId: `import-${index}`,
            createdAt: new Date(now.getTime() + index * 1000),
          })),
      })
    }

    return { sessionId: session.id }
  } catch (error) {
    console.error('[memory:manager] importConversation failed:', errorSummary(error))
    return null
  }
}

// ---------------------------------------------------------------------------
// Session metadata mutations
// ---------------------------------------------------------------------------

/**
 * Rename a session.
 *
 * @param sessionId - Session to rename.
 * @param title     - New title (truncated to 200 chars).
 */
export async function renameSession(sessionId: string, title: string): Promise<void> {
  if (!sessionId) return
  const trimmed = (title || '').trim().slice(0, 200)
  if (!trimmed) return
  try {
    await db.tutorSession.update({
      where: { id: sessionId },
      data: { title: trimmed },
    })
  } catch (error) {
    console.error('[memory:manager] renameSession failed:', errorSummary(error))
  }
}

/**
 * Archive or unarchive a session. Archived sessions are excluded from the
 * default session list.
 *
 * @param sessionId - Session to archive/unarchive.
 * @param archived  - `true` to archive, `false` to unarchive.
 */
export async function archiveSession(
  sessionId: string,
  archived: boolean,
): Promise<void> {
  if (!sessionId) return
  try {
    await db.tutorSession.update({
      where: { id: sessionId },
      data: { archived: Boolean(archived) },
    })
  } catch (error) {
    console.error('[memory:manager] archiveSession failed:', errorSummary(error))
  }
}

/**
 * Hard-delete a session and all of its data. Messages, memories, and summaries
 * are deleted first (messages + memories don't cascade-delete in the schema);
 * the session row is deleted last.
 *
 * @param sessionId - Session to delete.
 */
export async function deleteSession(sessionId: string): Promise<void> {
  if (!sessionId) return
  try {
    await db.$transaction([
      db.tutorMessage.deleteMany({ where: { sessionId } }),
      db.tutorMemory.deleteMany({ where: { sessionId } }),
      db.tutorSessionSummary.deleteMany({ where: { sessionId } }),
      db.tutorSession.delete({ where: { id: sessionId } }),
    ])
  } catch (error) {
    console.error('[memory:manager] deleteSession failed:', errorSummary(error))
  }
}

// ---------------------------------------------------------------------------
// Listing
// ---------------------------------------------------------------------------

/**
 * List a user's tutor sessions, newest first.
 *
 * @param userId - Owning user ID.
 * @param opts   - `{ includeArchived?: boolean }` — defaults to `false`.
 * @returns Sessions with their message counts, or an empty array on failure.
 */
export async function listSessions(
  userId: string,
  opts?: { includeArchived?: boolean },
): Promise<
  Array<{
    id: string
    title: string
    updatedAt: string
    archived: boolean
    messageCount: number
  }>
> {
  if (!userId) return []
  try {
    const where = {
      userId,
      ...(opts?.includeArchived ? {} : { archived: false }),
    }
    const sessions = await db.tutorSession.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        archived: true,
        _count: { select: { messages: true } },
      },
    })
    return sessions.map((session) => ({
      id: session.id,
      title: session.title,
      updatedAt: session.updatedAt.toISOString(),
      archived: session.archived,
      messageCount: session._count?.messages ?? 0,
    }))
  } catch (error) {
    console.error('[memory:manager] listSessions failed:', errorSummary(error))
    return []
  }
}

// ---------------------------------------------------------------------------
// Convenience re-exports — callers of `manager` get the full session-management
// surface plus access to the lower-level message fetcher used by other modules.
// ---------------------------------------------------------------------------

export { getSessionMessages } from '@/lib/ai/memory/store'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function errorSummary(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message.slice(0, 240)}`
  return String(error).slice(0, 240)
}

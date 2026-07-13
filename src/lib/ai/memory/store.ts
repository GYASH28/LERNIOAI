import 'server-only'

// ---------------------------------------------------------------------------
// Conversation Memory System — persistence layer.
//
// All CRUD operations for `TutorMemory` and `TutorSessionSummary` live here.
// Every function is defensive: DB errors are logged and translated into safe
// defaults (empty arrays, null, no-op) so the chat flow never crashes because
// of a memory subsystem failure.
// ---------------------------------------------------------------------------

import type { TutorMessage as PrismaTutorMessage } from '@prisma/client'

import { db } from '@/lib/db'
import { estimateTokens } from '@/lib/ai/memory/token-counter'
import {
  isMemoryCategory,
  type ConversationMemory,
  type ExtractedMemory,
  type MemoryCategory,
  type SessionSummary,
} from '@/lib/ai/memory/types'

// ---------------------------------------------------------------------------
// Row → DTO mappers
// ---------------------------------------------------------------------------

type MemoryRow = {
  id: string
  sessionId: string
  category: string
  label: string
  content: string
  active: boolean
  importance: number
  createdAt: Date
  updatedAt: Date
}

type SummaryRow = {
  id: string
  sessionId: string
  summary: string
  startIdx: number
  endIdx: number
  originalTokens: number
  summaryTokens: number
  createdAt: Date
}

function mapMemoryRow(row: MemoryRow): ConversationMemory {
  const category: MemoryCategory = isMemoryCategory(row.category) ? row.category : 'other'
  return {
    id: row.id,
    sessionId: row.sessionId,
    category,
    label: row.label,
    content: row.content,
    active: row.active,
    importance: row.importance,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function mapSummaryRow(row: SummaryRow): SessionSummary {
  return {
    id: row.id,
    sessionId: row.sessionId,
    summary: row.summary,
    startIdx: row.startIdx,
    endIdx: row.endIdx,
    originalTokens: row.originalTokens,
    summaryTokens: row.summaryTokens,
    createdAt: row.createdAt.toISOString(),
  }
}

function clampImportance(value: number): number {
  if (!Number.isFinite(value)) return 3
  return Math.max(1, Math.min(5, Math.round(value)))
}

// ---------------------------------------------------------------------------
// Memory CRUD
// ---------------------------------------------------------------------------

/**
 * Fetch all *active* memories for a session, ordered by `importance` DESC then
 * `updatedAt` DESC so the most important / recently touched facts surface first
 * in the assembled context.
 *
 * @param sessionId - The tutor session ID.
 * @returns Active memories (empty array on error or when none exist).
 */
export async function getActiveMemories(sessionId: string): Promise<ConversationMemory[]> {
  if (!sessionId) return []
  try {
    const rows = await db.tutorMemory.findMany({
      where: { sessionId, active: true },
      orderBy: [{ importance: 'desc' }, { updatedAt: 'desc' }],
    })
    return rows.map((row) => mapMemoryRow(row as unknown as MemoryRow))
  } catch (error) {
    console.error('[memory:store] getActiveMemories failed:', errorSummary(error))
    return []
  }
}

/**
 * Create a new memory row for the session.
 *
 * @param sessionId   - The tutor session ID.
 * @param memory      - Extracted memory to persist.
 * @returns The created memory DTO, or `null` on failure.
 */
export async function addMemory(
  sessionId: string,
  memory: ExtractedMemory,
): Promise<ConversationMemory | null> {
  if (!sessionId) return null
  try {
    const row = await db.tutorMemory.create({
      data: {
        sessionId,
        category: memory.category,
        label: memory.label.slice(0, 240),
        content: memory.content,
        importance: clampImportance(memory.importance),
        active: true,
      },
    })
    return mapMemoryRow(row as unknown as MemoryRow)
  } catch (error) {
    console.error('[memory:store] addMemory failed:', errorSummary(error))
    return null
  }
}

/**
 * Soft-delete a memory (set `active = false`). The row is retained so it can be
 * inspected or re-activated later.
 *
 * @param memoryId - ID of the memory row.
 */
export async function deactivateMemory(memoryId: string): Promise<void> {
  if (!memoryId) return
  try {
    await db.tutorMemory.update({
      where: { id: memoryId },
      data: { active: false },
    })
  } catch (error) {
    console.error('[memory:store] deactivateMemory failed:', errorSummary(error))
  }
}

/**
 * Hard-delete a memory row.
 *
 * @param memoryId - ID of the memory row.
 */
export async function deleteMemory(memoryId: string): Promise<void> {
  if (!memoryId) return
  try {
    await db.tutorMemory.delete({ where: { id: memoryId } })
  } catch (error) {
    console.error('[memory:store] deleteMemory failed:', errorSummary(error))
  }
}

/**
 * Update the `importance` field of a memory (1–5 scale). Out-of-range values
 * are clamped.
 *
 * @param memoryId    - ID of the memory row.
 * @param importance  - New importance value (clamped to 1–5).
 */
export async function updateMemoryImportance(
  memoryId: string,
  importance: number,
): Promise<void> {
  if (!memoryId) return
  try {
    await db.tutorMemory.update({
      where: { id: memoryId },
      data: { importance: clampImportance(importance) },
    })
  } catch (error) {
    console.error('[memory:store] updateMemoryImportance failed:', errorSummary(error))
  }
}

/**
 * Find an active memory in a session whose label matches `label` (case-insensitive
 * exact match). Used by the extractor to dedupe memories before inserting.
 *
 * @param sessionId - The tutor session ID.
 * @param label     - Label to match.
 * @returns The matching memory DTO or `null` when none / on error.
 */
export async function findMemoryByLabel(
  sessionId: string,
  label: string,
): Promise<ConversationMemory | null> {
  if (!sessionId || !label) return null
  try {
    const row = await db.tutorMemory.findFirst({
      where: {
        sessionId,
        active: true,
        label: { equals: label, mode: 'insensitive' },
      },
      orderBy: { updatedAt: 'desc' },
    })
    return row ? mapMemoryRow(row as unknown as MemoryRow) : null
  } catch (error) {
    console.error('[memory:store] findMemoryByLabel failed:', errorSummary(error))
    return null
  }
}

/**
 * Overwrite the `content` and `importance` of an existing memory row. Used by
 * the extractor when the same label is re-encountered with fresher information.
 *
 * @param memoryId    - ID of the memory row.
 * @param content     - New content.
 * @param importance  - New importance (clamped to 1–5). Falls back to the existing value when omitted.
 */
export async function updateMemoryContent(
  memoryId: string,
  content: string,
  importance?: number,
): Promise<void> {
  if (!memoryId) return
  try {
    await db.tutorMemory.update({
      where: { id: memoryId },
      data: {
        content,
        ...(typeof importance === 'number' ? { importance: clampImportance(importance) } : {}),
      },
    })
  } catch (error) {
    console.error('[memory:store] updateMemoryContent failed:', errorSummary(error))
  }
}

// ---------------------------------------------------------------------------
// Summary CRUD
// ---------------------------------------------------------------------------

/**
 * Fetch all summaries for a session, ordered by `startIdx` ASC so the retrieval
 * layer can present them chronologically.
 *
 * @param sessionId - The tutor session ID.
 * @returns Summary DTOs (empty array on error or when none exist).
 */
export async function getSummaries(sessionId: string): Promise<SessionSummary[]> {
  if (!sessionId) return []
  try {
    const rows = await db.tutorSessionSummary.findMany({
      where: { sessionId },
      orderBy: { startIdx: 'asc' },
    })
    return rows.map((row) => mapSummaryRow(row as unknown as SummaryRow))
  } catch (error) {
    console.error('[memory:store] getSummaries failed:', errorSummary(error))
    return []
  }
}

/**
 * Persist a new summary covering the message range `[startIdx, endIdx]` (inclusive).
 * `originalTokens` and `summaryTokens` are stored for cost/efficiency reporting.
 *
 * @param sessionId       - The tutor session ID.
 * @param summary         - The summary text.
 * @param startIdx        - First message index covered (inclusive).
 * @param endIdx          - Last message index covered (inclusive).
 * @param originalTokens  - Approximate token count of the original messages.
 * @param summaryTokens   - Token count of the summary text.
 * @returns The created summary DTO, or `null` on failure.
 */
export async function addSummary(
  sessionId: string,
  summary: string,
  startIdx: number,
  endIdx: number,
  originalTokens: number,
  summaryTokens: number,
): Promise<SessionSummary | null> {
  if (!sessionId) return null
  try {
    const row = await db.tutorSessionSummary.create({
      data: {
        sessionId,
        summary,
        startIdx,
        endIdx,
        originalTokens,
        summaryTokens,
      },
    })
    return mapSummaryRow(row as unknown as SummaryRow)
  } catch (error) {
    console.error('[memory:store] addSummary failed:', errorSummary(error))
    return null
  }
}

/**
 * Delete all summaries for a session whose range starts at or after `startIdx`.
 * Used by the summarizer to keep the summary set coherent after a re-summarisation.
 *
 * @param sessionId - The tutor session ID.
 * @param startIdx  - Inclusive lower bound on summary `startIdx`.
 */
export async function deleteSummariesAfter(
  sessionId: string,
  startIdx: number,
): Promise<void> {
  if (!sessionId) return
  try {
    await db.tutorSessionSummary.deleteMany({
      where: { sessionId, startIdx: { gte: startIdx } },
    })
  } catch (error) {
    console.error('[memory:store] deleteSummariesAfter failed:', errorSummary(error))
  }
}

// ---------------------------------------------------------------------------
// Message helpers
// ---------------------------------------------------------------------------

/**
 * Fetch messages for a session ordered by `createdAt` ASC (chronological).
 * Optionally limit to the most recent `limit` rows (still ordered ASC).
 *
 * @param sessionId - The tutor session ID.
 * @param limit     - Optional cap on the number of rows returned.
 * @returns Prisma `TutorMessage` rows.
 */
export async function getSessionMessages(
  sessionId: string,
  limit?: number,
): Promise<PrismaTutorMessage[]> {
  if (!sessionId) return []
  try {
    const rows = await db.tutorMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      ...(typeof limit === 'number' && limit > 0 ? { take: limit } : {}),
    })
    return rows
  } catch (error) {
    console.error('[memory:store] getSessionMessages failed:', errorSummary(error))
    return []
  }
}

/**
 * Count the messages in a session.
 *
 * @param sessionId - The tutor session ID.
 * @returns The number of messages (0 on error).
 */
export async function getSessionMessageCount(sessionId: string): Promise<number> {
  if (!sessionId) return 0
  try {
    return await db.tutorMessage.count({ where: { sessionId } })
  } catch (error) {
    console.error('[memory:store] getSessionMessageCount failed:', errorSummary(error))
    return 0
  }
}

/**
 * Convenience helper used by the summarizer: compute the token cost of a slice
 * of messages without re-fetching from the DB. Exported so unit tests and the
 * summarizer can share the same math.
 *
 * @param messages - Messages to measure.
 * @returns Total estimated token count.
 */
export function totalMessageTokens(
  messages: Array<{ role: string; content: string }>,
): number {
  let total = 0
  for (const message of messages) total += estimateTokens(message.content)
  return total
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function errorSummary(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message.slice(0, 240)}`
  return String(error).slice(0, 240)
}

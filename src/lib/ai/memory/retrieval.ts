import 'server-only'

// ---------------------------------------------------------------------------
// Conversation Memory System — retrieval.
//
// `buildContextForAI` is the entry point called by the tutor runtime before
// each AI turn. It assembles a `RetrievedContext` consisting of:
//   1. Active memories (goals, preferences, decisions, …) — always included.
//   2. Session summaries — compressed accounts of older conversation.
//   3. Recent messages (last N) — full detail.
//
// If the assembled context exceeds `maxContextTokens`, the oldest recent
// messages are trimmed first (summaries + memories are always retained).
//
// `formatContextForSystemPrompt` renders the context into a labelled text
// block that the tutor runtime can append to its system prompt.
// ---------------------------------------------------------------------------

import {
  estimateMessageTokens,
  estimateTokens,
} from '@/lib/ai/memory/token-counter'
import {
  getActiveMemories,
  getSessionMessages,
  getSummaries,
} from '@/lib/ai/memory/store'
import {
  resolveMemoryConfig,
  type ConversationMemory,
  type MemoryConfig,
  type RetrievedContext,
} from '@/lib/ai/memory/types'

// ---------------------------------------------------------------------------
// Context assembly
// ---------------------------------------------------------------------------

/**
 * Build the retrieved context for a session, ready to be injected into the AI
 * system prompt.
 *
 * Steps:
 *   1. Fetch active memories — always included (goals, preferences, decisions).
 *   2. Fetch all session summaries — provide context from older conversation.
 *   3. Fetch recent messages (last `shortTermLimit`) — full detail.
 *   4. Assemble into a `RetrievedContext`.
 *   5. Estimate total tokens; if over `maxContextTokens`, trim the oldest
 *      recent messages first (summaries + memories are always retained).
 *
 * `currentMessage` is included in the returned `recentMessages` only when the
 * caller explicitly adds it; this function does not append the in-flight user
 * message — the tutor runtime is responsible for appending it to the AI call's
 * `messages` array. The argument is accepted so it can be included in the
 * token budget estimate.
 *
 * @param sessionId       - The tutor session ID.
 * @param currentMessage  - The user message currently being processed (used for token budgeting only).
 * @param config          - Optional config overrides.
 * @returns The assembled context (always non-null; fields may be empty).
 */
export async function buildContextForAI(
  sessionId: string,
  currentMessage: string,
  config?: Partial<MemoryConfig>,
): Promise<RetrievedContext> {
  const cfg = resolveMemoryConfig(config)

  if (!sessionId) {
    return {
      recentMessages: [],
      summaries: [],
      memories: [],
      estimatedTokens: estimateTokens(currentMessage),
    }
  }

  try {
    const [memories, summaries, recentRows] = await Promise.all([
      getActiveMemories(sessionId),
      getSummaries(sessionId),
      getSessionMessages(sessionId, cfg.shortTermLimit),
    ])

    const recentMessages: Array<{ role: 'user' | 'assistant'; content: string }> = recentRows.map(
      (row) => ({
        role: row.role === 'assistant' ? 'assistant' : 'user',
        content: row.content,
      }),
    )

    const summaryTexts = summaries.map((summary) => summary.summary)

    const baseContext: RetrievedContext = {
      recentMessages,
      summaries: summaryTexts,
      memories,
      estimatedTokens: 0,
    }

    baseContext.estimatedTokens = computeContextTokens(baseContext, currentMessage)

    // Trim oldest recent messages first if we're over budget. Memories and
    // summaries are always retained — they are the highest-signal context.
    const trimmed = trimToTokenBudget(baseContext, currentMessage, cfg.maxContextTokens)

    return trimmed
  } catch (error) {
    console.error(
      `[memory:retrieval] buildContextForAI failed for session ${sessionId}:`,
      errorSummary(error),
    )
    return {
      recentMessages: [],
      summaries: [],
      memories: [],
      estimatedTokens: estimateTokens(currentMessage),
    }
  }
}

/**
 * Compute the approximate token cost of a context plus the in-flight user
 * message. Includes per-section structural overhead so the budget math stays
 * realistic.
 */
function computeContextTokens(context: RetrievedContext, currentMessage: string): number {
  let total = 0
  // Section headers + labels in the formatted prompt.
  total += 64
  total += estimateMessageTokens(context.recentMessages)
  for (const summary of context.summaries) total += estimateTokens(summary)
  for (const memory of context.memories) {
    total += estimateTokens(memory.label) + estimateTokens(memory.content)
  }
  total += estimateTokens(currentMessage)
  return total
}

/**
 * Drop the oldest entries from `recentMessages` until the total token count
 * fits within `maxTokens`. Memories and summaries are never dropped. At least
 * the last 2 recent messages are always retained so the AI has the immediate
 * question plus the previous turn for grounding.
 */
function trimToTokenBudget(
  context: RetrievedContext,
  currentMessage: string,
  maxTokens: number,
): RetrievedContext {
  if (context.estimatedTokens <= maxTokens) return context

  const recentMessages = [...context.recentMessages]
  let estimated = context.estimatedTokens

  while (recentMessages.length > 2 && estimated > maxTokens) {
    const dropped = recentMessages.shift()
    if (!dropped) break
    // Subtract the dropped message's tokens (content + ~4 structural overhead).
    estimated -= estimateTokens(dropped.content) + 4
  }

  return {
    ...context,
    recentMessages,
    estimatedTokens: computeContextTokens(
      { ...context, recentMessages },
      currentMessage,
    ),
  }
}

// ---------------------------------------------------------------------------
// System-prompt formatting
// ---------------------------------------------------------------------------

/**
 * Format a `RetrievedContext` into a labelled text block suitable for
 * appending to the AI system prompt.
 *
 * Format:
 * ```
 * [CONVERSATION MEMORY]
 * User goals: ...
 * Preferences: ...
 * Decisions made: ...
 *
 * [EARLIER CONVERSATION SUMMARY]
 * ...summary text...
 *
 * [RECENT CONVERSATION]
 * User: ...
 * LEO: ...
 * ```
 *
 * Only sections that have content are included. The returned string is empty
 * when the context has no memories, summaries, or recent messages.
 *
 * @param context - The assembled context.
 * @returns A formatted prompt block (possibly empty).
 */
export function formatContextForSystemPrompt(context: RetrievedContext): string {
  const sections: string[] = []

  const memoryBlock = formatMemoryBlock(context.memories)
  if (memoryBlock) sections.push(memoryBlock)

  const summaryBlock = formatSummaryBlock(context.summaries)
  if (summaryBlock) sections.push(summaryBlock)

  const recentBlock = formatRecentBlock(context.recentMessages)
  if (recentBlock) sections.push(recentBlock)

  if (sections.length === 0) return ''
  return sections.join('\n\n')
}

/**
 * Group memories by category and render them as labelled lines:
 *   User goals: ...
 *   Preferences: ...
 *   Decisions made: ...
 *
 * Categories with no memories are omitted.
 */
function formatMemoryBlock(memories: ConversationMemory[]): string {
  if (!memories || memories.length === 0) return ''

  const groups: Record<string, string[]> = {}
  for (const memory of memories) {
    const key = memory.category
    if (!groups[key]) groups[key] = []
    groups[key].push(`${memory.label}: ${memory.content}`)
  }

  const lines: string[] = ['[CONVERSATION MEMORY]']
  const labelled = LABELS_BY_CATEGORY
  for (const category of Object.keys(groups)) {
    const label = labelled[category] ?? titleCase(category)
    const items = groups[category]
    if (!items || items.length === 0) continue
    lines.push(`${label}: ${items.join(' | ')}`)
  }

  return lines.join('\n')
}

/** Render the summaries as a single bracketed section. */
function formatSummaryBlock(summaries: string[]): string {
  if (!summaries || summaries.length === 0) return ''
  const body = summaries.map((summary) => summary.trim()).filter(Boolean).join('\n\n')
  if (!body) return ''
  return `[EARLIER CONVERSATION SUMMARY]\n${body}`
}

/** Render the recent messages as a labelled transcript (User / LEO). */
function formatRecentBlock(
  recent: Array<{ role: 'user' | 'assistant'; content: string }>,
): string {
  if (!recent || recent.length === 0) return ''
  const body = recent
    .map((message) => {
      const speaker = message.role === 'assistant' ? 'LEO' : 'User'
      return `${speaker}: ${message.content}`
    })
    .join('\n')
  return `[RECENT CONVERSATION]\n${body}`
}

/** Human-readable labels for each memory category, used in the prompt. */
const LABELS_BY_CATEGORY: Record<string, string> = {
  goal: 'User goals',
  preference: 'Preferences',
  decision: 'Decisions made',
  code_snippet: 'Code snippets',
  file_ref: 'File references',
  fact: 'Facts learned',
  deadline: 'Deadlines',
  api_key_ref: 'API key references',
  project_name: 'Project names',
  constraint: 'Constraints',
  other: 'Other notes',
}

function titleCase(value: string): string {
  if (!value) return value
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function errorSummary(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message.slice(0, 240)}`
  return String(error).slice(0, 240)
}

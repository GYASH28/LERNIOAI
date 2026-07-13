import 'server-only'

// ---------------------------------------------------------------------------
// Conversation Memory System — summarizer.
//
// Compresses older conversation messages into a flowing summary so the AI can
// keep long-running tutor sessions coherent without re-feeding every past
// message (which would blow the context budget).
//
// Strategy:
//   - Gemini is preferred for summarization (1M-token context window).
//   - If Gemini is not configured or returns its fallback, Groq is tried.
//   - Summaries cover contiguous message ranges and are stored in
//     `TutorSessionSummary` with their `[startIdx, endIdx]` range so the
//     summarizer is idempotent and never re-summarises already-covered ranges.
// ---------------------------------------------------------------------------

import { getAiProvider } from '@/lib/ai/provider'
import { getGeminiProvider } from '@/lib/ai/gemini-provider'
import { estimateTokens } from '@/lib/ai/memory/token-counter'
import {
  addSummary,
  getSessionMessageCount,
  getSessionMessages,
  getSummaries,
} from '@/lib/ai/memory/store'
import {
  resolveMemoryConfig,
  type MemoryConfig,
} from '@/lib/ai/memory/types'

const SUMMARIZATION_SYSTEM_PROMPT =
  'Summarize this conversation segment. Preserve: user goals, key decisions, code snippets, preferences, facts learned, and any deadlines mentioned. Be concise but complete. Output a flowing summary, not bullet points.'

/** Max messages we feed into a single summarisation call. */
const MAX_MESSAGES_PER_SUMMARY = 40

// ---------------------------------------------------------------------------
// Core summarisation
// ---------------------------------------------------------------------------

/**
 * Summarise a contiguous slice of messages for a session.
 *
 * The messages are converted into OpenAI-style `{ role, content }` pairs and
 * sent to the AI provider with a fixed system prompt. Gemini is preferred for
 * its 1M-token context; Groq is the fallback. If both providers return their
 * own fallback message (or fail), an empty string is returned and the caller
 * should treat that as "no summary stored".
 *
 * @param sessionId - The tutor session ID (used for logging only).
 * @param messages  - The messages to summarise. `role` must be 'user' or 'assistant'.
 * @param startIdx  - First message index covered (inclusive) — passed for logging.
 * @param endIdx    - Last message index covered (inclusive) — passed for logging.
 * @returns The summary text, or an empty string on total failure.
 */
export async function summarizeOldMessages(
  sessionId: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  startIdx: number,
  endIdx: number,
): Promise<string> {
  if (!messages || messages.length === 0) return ''

  try {
    const transcript = buildTranscript(messages)
    const userMessage = `Conversation segment (messages ${startIdx}–${endIdx}):\n\n${transcript}`

    const providerMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      { role: 'user', content: userMessage },
    ]

    const summary = await callSummarizer(providerMessages)
    return summary
  } catch (error) {
    console.error(
      `[memory:summarizer] summarizeOldMessages failed for session ${sessionId}:`,
      errorSummary(error),
    )
    return ''
  }
}

/**
 * Call the summarizer LLM. Tries Gemini first (1M context), then Groq.
 * Returns the first non-fallback result; if both return fallbacks, returns
 * the Gemini fallback content (best-effort) or empty string.
 */
async function callSummarizer(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<string> {
  const gemini = getGeminiProvider()

  // --- Gemini preferred -----------------------------------------------------
  if (gemini.isConfigured()) {
    try {
      const result = await gemini.chat({
        systemPrompt: SUMMARIZATION_SYSTEM_PROMPT,
        messages,
        maxTokens: 800,
      })
      if (!result.usedFallback && result.content.trim()) {
        return result.content.trim()
      }
    } catch (error) {
      console.warn('[memory:summarizer] Gemini summary failed; trying Groq:', errorSummary(error))
    }
  }

  // --- Groq fallback --------------------------------------------------------
  const groq = getAiProvider()
  try {
    const result = await groq.chat({
      systemPrompt: SUMMARIZATION_SYSTEM_PROMPT,
      messages,
      maxTokens: 800,
    })
    if (result.content.trim() && !result.usedFallback) {
      return result.content.trim()
    }
    // Even Groq's fallback is better than nothing — return it if non-empty.
    return result.content.trim()
  } catch (error) {
    console.error('[memory:summarizer] Groq summary also failed:', errorSummary(error))
    return ''
  }
}

/**
 * Render an array of chat messages into a labelled transcript suitable for the
 * summarisation prompt. Each message is prefixed with `User:` or `LEO:`.
 */
function buildTranscript(messages: Array<{ role: string; content: string }>): string {
  return messages
    .map((message) => {
      const speaker = message.role === 'assistant' ? 'LEO' : 'User'
      return `${speaker}: ${message.content}`
    })
    .join('\n\n')
}

// ---------------------------------------------------------------------------
// Idempotent summarisation trigger
// ---------------------------------------------------------------------------

/**
 * Check whether a session needs summarisation, and if so, summarise the oldest
 * unsummarised messages and persist the result.
 *
 * Rules:
 *   1. If the total message count is at or below `summarizationThreshold`, do nothing.
 *   2. Find the highest `endIdx` covered by existing summaries — that + 1 is the
 *      start of the next unsummarised range.
 *   3. The last `shortTermLimit` messages are kept in full detail (short-term
 *      memory), so summarisation only covers messages before that point.
 *   4. If the resulting range is empty or already fully covered, do nothing
 *      (idempotent).
 *   5. The range is capped at `MAX_MESSAGES_PER_SUMMARY` messages per call so a
 *      single summarisation stays fast; subsequent invocations will pick up the
 *      next chunk.
 *
 * @param sessionId - The tutor session ID.
 * @param config    - Optional config overrides.
 */
export async function maybeSummarize(
  sessionId: string,
  config?: Partial<MemoryConfig>,
): Promise<void> {
  if (!sessionId) return

  const cfg = resolveMemoryConfig(config)

  try {
    const totalCount = await getSessionMessageCount(sessionId)
    if (totalCount <= cfg.summarizationThreshold) return

    // Find where existing summaries end.
    const existing = await getSummaries(sessionId)
    let coveredUntil = -1
    for (const summary of existing) {
      if (summary.endIdx > coveredUntil) coveredUntil = summary.endIdx
    }
    const nextStartIdx = coveredUntil + 1

    // Messages before this index are still "short-term" and kept in full.
    const shortTermStartIdx = Math.max(0, totalCount - cfg.shortTermLimit)

    // Nothing to summarise — the unsummarised range lies entirely inside
    // short-term memory.
    if (shortTermStartIdx <= nextStartIdx) return

    // Cap each summarisation call to keep latency bounded.
    const desiredEndIdx = shortTermStartIdx - 1
    const maxEndIdx = nextStartIdx + MAX_MESSAGES_PER_SUMMARY - 1
    const endIdx = Math.min(desiredEndIdx, maxEndIdx)

    if (endIdx < nextStartIdx) return

    // Fetch the slice. getSessionMessages orders by createdAt ASC and the
    // returned array index corresponds to message position in the session.
    const allMessages = await getSessionMessages(sessionId, endIdx + 1)
    const slice = allMessages.slice(nextStartIdx, endIdx + 1)
    if (slice.length === 0) return

    const providerMessages: Array<{ role: 'user' | 'assistant'; content: string }> = slice.map(
      (row) => ({
        role: row.role === 'assistant' ? 'assistant' : 'user',
        content: row.content,
      }),
    )

    const summary = await summarizeOldMessages(
      sessionId,
      providerMessages,
      nextStartIdx,
      endIdx,
    )
    if (!summary) return

    const originalTokens = providerMessages.reduce(
      (sum, message) => sum + estimateTokens(message.content),
      0,
    )
    const summaryTokens = estimateTokens(summary)

    await addSummary(sessionId, summary, nextStartIdx, endIdx, originalTokens, summaryTokens)
  } catch (error) {
    console.error(
      `[memory:summarizer] maybeSummarize failed for session ${sessionId}:`,
      errorSummary(error),
    )
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function errorSummary(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message.slice(0, 240)}`
  return String(error).slice(0, 240)
}

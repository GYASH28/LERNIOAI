import 'server-only'

// ---------------------------------------------------------------------------
// Lightweight token estimation.
//
// We deliberately avoid pulling in a tokeniser dependency (tiktoken / gpt-tokenizer)
// because (a) memory-system budgets are approximate by design and (b) the AI
// providers already enforce hard server-side limits. The heuristic of ~4 chars
// per token matches OpenAI's documented average for English text and is close
// enough for code-heavy tutor conversations.
// ---------------------------------------------------------------------------

const CHARS_PER_TOKEN = 4

/**
 * Estimate the token count of an arbitrary string.
 *
 * The heuristic is `Math.ceil(length / 4)` with a minimum of 1 for any non-empty
 * string. Empty strings return 0 so callers can sum without conditionals.
 *
 * @param text - The text to estimate. May be empty or nullish.
 * @returns Approximate number of tokens (always a non-negative integer).
 */
export function estimateTokens(text: string): number {
  if (!text) return 0
  const length = text.length
  if (length === 0) return 0
  return Math.max(1, Math.ceil(length / CHARS_PER_TOKEN))
}

/**
 * Estimate the token count of a list of chat messages.
 *
 * Each OpenAI-style message carries a small structural overhead (~4 tokens for
 * role + delimiters) plus the token count of its content. We add 4 tokens of
 * overhead per message so the budget math stays realistic.
 *
 * @param messages - Messages with a `role` and `content` field.
 * @returns Approximate token count for the whole list.
 */
export function estimateMessageTokens(
  messages: Array<{ role: string; content: string }>,
): number {
  if (!messages || messages.length === 0) return 0
  let total = 0
  for (const message of messages) {
    total += 4 // per-message structural overhead
    total += estimateTokens(message.content)
    if (message.role) total += estimateTokens(message.role)
  }
  return total
}

import 'server-only'

// ---------------------------------------------------------------------------
// Conversation Memory System — extractor.
//
// Auto-extracts structured memories (goals, preferences, decisions, code
// snippets, deadlines, …) from user messages so the AI can recall them across
// a long tutor session without re-reading the whole transcript.
//
// Routing:
//   - Prefer Groq's fast model (`llama-3.1-8b-instant`) for extraction —
//     latency matters because this runs on every user turn.
//   - If Groq is not configured, fall back to Gemini's flash-lite model.
//   - If neither is configured, extraction is silently skipped.
// ---------------------------------------------------------------------------

import {
  addMemory,
  findMemoryByLabel,
  updateMemoryContent,
} from '@/lib/ai/memory/store'
import {
  isMemoryCategory,
  type ExtractedMemory,
} from '@/lib/ai/memory/types'

const GROQ_API_BASE = 'https://api.groq.com/openai/v1'
const GROQ_DEFAULT_FAST_MODEL = 'llama-3.1-8b-instant'

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'
const GEMINI_DEFAULT_FAST_MODEL = 'gemini-2.0-flash-lite'

const EXTRACTION_SYSTEM_PROMPT =
  'Analyze this user message and extract any important memories. Categories: goal, preference, decision, code_snippet, file_ref, fact, deadline, api_key_ref, project_name, constraint, other. Only extract genuinely important info — do not extract trivial small talk. If nothing important, return an empty array. Respond as JSON: {"memories": [{"category": "...", "label": "...", "content": "...", "importance": 1-5}]}'

const REQUEST_TIMEOUT_MS = 18_000

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Analyse a single message and extract structured memories from it.
 *
 * Assistant messages are skipped entirely (extraction only runs on user
 * messages, since the assistant's text is generated and not a statement of
 * the user's intent). When no provider is configured or the call fails, an
 * empty array is returned — the chat flow is never blocked by extraction.
 *
 * @param message - The message to analyse. `role` should be 'user' or 'assistant'.
 * @returns Extracted memories (possibly empty).
 */
export async function extractMemoriesFromMessage(message: {
  role: string
  content: string
}): Promise<ExtractedMemory[]> {
  // Only extract from user messages — assistant text is generated, not a
  // statement of the user's intent.
  if (!message || message.role !== 'user') return []
  const trimmed = message.content?.trim()
  if (!trimmed) return []
  if (trimmed.length < 12) return []

  try {
    const raw = await callExtractor(trimmed)
    if (!raw) return []
    return parseExtractionJson(raw)
  } catch (error) {
    console.error('[memory:extractor] extractMemoriesFromMessage failed:', errorSummary(error))
    return []
  }
}

/**
 * Extract memories from a message and persist them for the session.
 *
 * Each extracted memory is deduplicated by `label` (case-insensitive). If a
 * memory with the same label already exists and is still active, its `content`
 * is overwritten with the fresher version (and `importance` is updated when
 * provided). API-key references are sanitised before storage — only the
 * placeholder "User mentioned an API key" is persisted, never the key itself.
 *
 * @param sessionId - The tutor session ID.
 * @param message   - The message to extract from.
 */
export async function extractAndStoreMemories(
  sessionId: string,
  message: { role: string; content: string },
): Promise<void> {
  if (!sessionId) return

  try {
    const extracted = await extractMemoriesFromMessage(message)
    if (extracted.length === 0) return

    for (const memory of extracted) {
      const sanitised = sanitiseMemory(memory)
      if (!sanitised.label || !sanitised.content) continue

      const existing = await findMemoryByLabel(sessionId, sanitised.label)
      if (existing) {
        await updateMemoryContent(existing.id, sanitised.content, sanitised.importance)
        continue
      }

      await addMemory(sessionId, sanitised)
    }
  } catch (error) {
    console.error(
      `[memory:extractor] extractAndStoreMemories failed for session ${sessionId}:`,
      errorSummary(error),
    )
  }
}

// ---------------------------------------------------------------------------
// Provider calls
// ---------------------------------------------------------------------------

/**
 * Call whichever fast provider is available. Returns the raw text response
 * (expected to be JSON), or an empty string on failure / when no provider is
 * configured.
 */
async function callExtractor(userMessage: string): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY?.trim()
  if (groqKey) {
    try {
      return await callGroqExtractor(groqKey, userMessage)
    } catch (error) {
      console.warn('[memory:extractor] Groq extraction failed; trying Gemini:', errorSummary(error))
    }
  }

  const geminiKey = process.env.GEMINI_API_KEY?.trim()
  if (geminiKey) {
    try {
      return await callGeminiExtractor(geminiKey, userMessage)
    } catch (error) {
      console.error('[memory:extractor] Gemini extraction failed:', errorSummary(error))
    }
  }

  return ''
}

/** Call Groq's `/chat/completions` with the fast model and JSON response mode. */
async function callGroqExtractor(apiKey: string, userMessage: string): Promise<string> {
  const model = process.env.GROQ_FAST_MODEL?.trim() || GROQ_DEFAULT_FAST_MODEL
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort('timeout'), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${GROQ_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.1,
        max_completion_tokens: 900,
        response_format: { type: 'json_object' },
      }),
      cache: 'no-store',
      signal: controller.signal,
    })

    if (!response.ok) {
      const detail = (await response.text().catch(() => '')).slice(0, 400)
      throw new Error(`GROQ_HTTP_${response.status}${detail ? `: ${detail}` : ''}`)
    }

    const data = (await response.json()) as GroqChatResponse
    return data.choices?.[0]?.message?.content?.trim() ?? ''
  } finally {
    clearTimeout(timer)
  }
}

/** Call Gemini's `:generateContent` with the flash-lite model and JSON mode. */
async function callGeminiExtractor(apiKey: string, userMessage: string): Promise<string> {
  const model = process.env.GEMINI_FAST_MODEL?.trim() || GEMINI_DEFAULT_FAST_MODEL
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort('timeout'), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(
      `${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: userMessage }] }],
          systemInstruction: { parts: [{ text: EXTRACTION_SYSTEM_PROMPT }] },
          generationConfig: {
            temperature: 0.1,
            topP: 0.95,
            maxOutputTokens: 900,
            responseMimeType: 'application/json',
          },
        }),
        cache: 'no-store',
        signal: controller.signal,
      },
    )

    if (!response.ok) {
      const detail = (await response.text().catch(() => '')).slice(0, 400)
      throw new Error(`GEMINI_HTTP_${response.status}${detail ? `: ${detail}` : ''}`)
    }

    const data = (await response.json()) as GeminiGenerateResponse
    const parts = data.candidates?.[0]?.content?.parts
    if (!Array.isArray(parts)) return ''
    return parts.map((part) => part?.text ?? '').join('').trim()
  } finally {
    clearTimeout(timer)
  }
}

// ---------------------------------------------------------------------------
// JSON parsing + sanitisation
// ---------------------------------------------------------------------------

/**
 * Parse the LLM's JSON response into a list of `ExtractedMemory` objects.
 *
 * Defensive: strips markdown fences, accepts both `{"memories": [...]}` and
 * a bare `[...]` array, validates each field, and silently drops anything that
 * doesn't fit the schema.
 */
function parseExtractionJson(raw: string): ExtractedMemory[] {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  if (!cleaned) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    // Try to extract the first JSON object/array from the text.
    const match = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
    if (!match) return []
    try {
      parsed = JSON.parse(match[0])
    } catch {
      return []
    }
  }

  const list = extractMemoriesArray(parsed)
  if (!Array.isArray(list)) return []

  const result: ExtractedMemory[] = []
  for (const item of list) {
    const memory = normaliseExtractedMemory(item)
    if (memory) result.push(memory)
  }
  return result
}

/** Accept either `{memories: [...]}` or a bare `[...]` payload. */
function extractMemoriesArray(parsed: unknown): unknown[] | null {
  if (Array.isArray(parsed)) return parsed as unknown[]
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>
    if (Array.isArray(obj.memories)) return obj.memories as unknown[]
    if (Array.isArray(obj.items)) return obj.items as unknown[]
    if (Array.isArray(obj.data)) return obj.data as unknown[]
  }
  return null
}

/** Convert one raw JSON item into an `ExtractedMemory`, or `null` if invalid. */
function normaliseExtractedMemory(item: unknown): ExtractedMemory | null {
  if (!item || typeof item !== 'object') return null
  const obj = item as Record<string, unknown>

  const category = isMemoryCategory(obj.category) ? obj.category : 'other'
  const label = typeof obj.label === 'string' ? obj.label.trim() : ''
  const content = typeof obj.content === 'string' ? obj.content.trim() : ''
  if (!label || !content) return null

  const importance = clampImportance(toNumber(obj.importance, 3))

  return { category, label, content, importance }
}

/**
 * Sanitise an extracted memory before persistence.
 *
 * For `api_key_ref`, the content is replaced with a placeholder so that no
 * secret material is ever written to the database. Labels that look like
 * they contain a key are also blanked.
 */
function sanitiseMemory(memory: ExtractedMemory): ExtractedMemory {
  if (memory.category === 'api_key_ref') {
    return {
      category: 'api_key_ref',
      label: 'API key reference',
      content: 'User mentioned an API key (value redacted for safety).',
      importance: memory.importance,
    }
  }

  // Defensive: scrub obvious key patterns from the content/label even when
  // the model categorised them as something else.
  const label = scrubSecrets(memory.label)
  const content = scrubSecrets(memory.content)
  return { ...memory, label, content }
}

/** Replace anything that looks like an API key / token with `[REDACTED]`. */
function scrubSecrets(text: string): string {
  return text
    .replace(/(sk-[a-zA-Z0-9_-]{16,})/g, '[REDACTED]')
    .replace(/(AIza[a-zA-Z0-9_-]{30,})/g, '[REDACTED]')
    .replace(/(gh[pousr]_[a-zA-Z0-9]{30,})/g, '[REDACTED]')
    .replace(/(Bearer\s+[a-zA-Z0-9._-]{16,})/gi, 'Bearer [REDACTED]')
}

// ---------------------------------------------------------------------------
// Provider response shapes (minimal — only the fields we read)
// ---------------------------------------------------------------------------

type GroqChatResponse = {
  choices?: Array<{ message?: { content?: string | null } }>
}

type GeminiGenerateResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string } | null> | null } | null }>
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function clampImportance(value: number): number {
  if (!Number.isFinite(value)) return 3
  return Math.max(1, Math.min(5, Math.round(value)))
}

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && Number.isFinite(Number(value))) return Number(value)
  return fallback
}

function errorSummary(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message.slice(0, 240)}`
  return String(error).slice(0, 240)
}

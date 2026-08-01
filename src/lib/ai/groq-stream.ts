import 'server-only'

import type { TutorMessage } from '@/lib/ai/provider'
import type { TutorModelProfile } from '@/lib/ai/tutor-runtime'

const API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const DEFAULT_QUALITY_MODEL = 'llama-3.3-70b-versatile'
const DEFAULT_FAST_MODEL = 'llama-3.1-8b-instant'

export class GroqStreamError extends Error {
  constructor(
    public code: string,
    public status: number,
    public retryable: boolean,
    message: string,
  ) {
    super(message)
    this.name = 'GroqStreamError'
  }
}

export function getGroqRuntimeStatus() {
  return {
    configured: Boolean(process.env.GROQ_API_KEY?.trim()),
    qualityModel: process.env.GROQ_MODEL?.trim() || DEFAULT_QUALITY_MODEL,
    fastModel: process.env.GROQ_FAST_MODEL?.trim() || DEFAULT_FAST_MODEL,
  }
}

/**
 * Streams from the preferred model and safely falls back to the alternate
 * model only when the first attempt failed before emitting any answer text.
 * This avoids duplicated/stitched answers while recovering from model-level
 * rate limits, temporary provider failures and unavailable model IDs.
 */
export async function* streamGroqChat(input: {
  systemPrompt: string
  messages: TutorMessage[]
  maxTokens: number
  profile: TutorModelProfile
  signal?: AbortSignal
}): AsyncGenerator<string> {
  const apiKey = process.env.GROQ_API_KEY?.trim()
  if (!apiKey) {
    throw new GroqStreamError(
      'AI_NOT_CONFIGURED',
      503,
      false,
      'LEO is not configured on this deployment yet. Add GROQ_API_KEY to the active Vercel project.',
    )
  }

  const qualityModel = process.env.GROQ_MODEL?.trim() || DEFAULT_QUALITY_MODEL
  const fastModel = process.env.GROQ_FAST_MODEL?.trim() || DEFAULT_FAST_MODEL
  const preferred = input.profile === 'quality' ? qualityModel : fastModel
  const alternate = input.profile === 'quality' ? fastModel : qualityModel
  const models = Array.from(new Set([preferred, alternate].filter(Boolean)))
  let lastError: unknown = null

  for (let index = 0; index < models.length; index += 1) {
    const model = models[index]
    let emitted = false

    try {
      for await (const token of streamModel({ ...input, apiKey, model })) {
        emitted = true
        yield token
      }
      return
    } catch (error) {
      lastError = error
      const providerError = error instanceof GroqStreamError ? error : null
      const mayFallback =
        index < models.length - 1
        && !emitted
        && !input.signal?.aborted
        && Boolean(providerError?.retryable || providerError?.code.startsWith('GROQ_HTTP_404'))

      if (!mayFallback) throw error
      console.warn('[leo:model-fallback]', {
        failedModel: model,
        fallbackModel: models[index + 1],
        code: providerError?.code,
      })
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new GroqStreamError('AI_UNAVAILABLE', 502, true, 'LEO could not complete this request. Please retry.')
}

async function* streamModel(input: {
  systemPrompt: string
  messages: TutorMessage[]
  maxTokens: number
  signal?: AbortSignal
  apiKey: string
  model: string
}): AsyncGenerator<string> {
  const timeoutMs = readPositiveInt(process.env.GROQ_TIMEOUT_MS, 35_000, 8_000, 55_000)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort('timeout'), timeoutMs)
  const abortFromCaller = () => controller.abort('external_abort')
  input.signal?.addEventListener('abort', abortFromCaller, { once: true })

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: input.model,
        messages: [
          { role: 'system', content: input.systemPrompt },
          ...normaliseMessages(input.messages),
        ],
        temperature: 0.3,
        top_p: 0.9,
        max_completion_tokens: Math.max(128, Math.min(input.maxTokens, 4000)),
        stream: true,
      }),
      cache: 'no-store',
      signal: controller.signal,
    })

    if (!response.ok) {
      const detail = (await response.text().catch(() => '')).slice(0, 400)
      const retryable = response.status === 408
        || response.status === 409
        || response.status === 429
        || response.status >= 500
      throw new GroqStreamError(
        `GROQ_HTTP_${response.status}`,
        response.status,
        retryable,
        safeProviderMessage(response.status, detail),
      )
    }

    if (!response.body) {
      throw new GroqStreamError('EMPTY_STREAM', 502, true, 'LEO received an empty response. Please try again.')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const rawLine of lines) {
        const line = rawLine.trim()
        if (!line.startsWith('data:')) continue
        const data = line.slice(5).trim()
        if (!data || data === '[DONE]') continue

        try {
          const event = JSON.parse(data) as {
            choices?: Array<{ delta?: { content?: string | null } }>
          }
          const token = event.choices?.[0]?.delta?.content
          if (token) yield token
        } catch {
          // Ignore malformed keep-alive/event fragments; valid deltas continue.
        }
      }
    }
  } catch (error) {
    if (error instanceof GroqStreamError) throw error
    if (input.signal?.aborted) {
      throw new GroqStreamError('REQUEST_ABORTED', 499, false, 'The response was stopped.')
    }
    if (controller.signal.aborted) {
      throw new GroqStreamError('AI_TIMEOUT', 504, true, 'LEO took too long to respond. Please retry.')
    }
    throw new GroqStreamError('AI_NETWORK_ERROR', 502, true, 'LEO could not reach the learning engine. Please retry.')
  } finally {
    clearTimeout(timeout)
    input.signal?.removeEventListener('abort', abortFromCaller)
  }
}

function normaliseMessages(messages: TutorMessage[]) {
  const recent = messages.slice(-14)
  const output: Array<{ role: 'user' | 'assistant'; content: string }> = []
  let totalChars = 0

  for (const message of recent.reverse()) {
    const content = message.content.trim().slice(0, 12_000)
    if (!content) continue
    if (totalChars + content.length > 42_000) break
    output.unshift({ role: message.role, content })
    totalChars += content.length
  }

  return output
}

function safeProviderMessage(status: number, detail: string) {
  if (status === 401 || status === 403) {
    return 'LEO cannot authenticate with the AI provider. Check GROQ_API_KEY on the active deployment.'
  }
  if (status === 404 || /model/i.test(detail)) {
    return 'LEO\'s configured model is unavailable. Check GROQ_MODEL and GROQ_FAST_MODEL.'
  }
  if (status === 429) return 'LEO is receiving too many requests. Please retry shortly.'
  if (status >= 500) return 'The AI provider is temporarily unavailable. Please retry.'
  return 'LEO could not complete this request. Please try again.'
}

function readPositiveInt(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value ?? '', 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(max, parsed))
}

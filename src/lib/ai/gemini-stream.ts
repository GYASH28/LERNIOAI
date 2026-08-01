import 'server-only'

import type { TutorMessage } from '@/lib/ai/provider'
import type { TutorModelProfile } from '@/lib/ai/tutor-runtime'

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
const DEFAULT_QUALITY_MODEL = 'gemini-3.5-flash'
const DEFAULT_FAST_MODEL = 'gemini-3.5-flash-lite'

export class GeminiStreamError extends Error {
  constructor(
    public code: string,
    public status: number,
    public retryable: boolean,
    message: string,
  ) {
    super(message)
    this.name = 'GeminiStreamError'
  }
}

export function getGeminiRuntimeStatus() {
  return {
    configured: Boolean(process.env.GEMINI_API_KEY?.trim()),
    qualityModel: process.env.GEMINI_MODEL?.trim() || DEFAULT_QUALITY_MODEL,
    fastModel: process.env.GEMINI_FAST_MODEL?.trim() || DEFAULT_FAST_MODEL,
  }
}

export async function* streamGeminiChat(input: {
  systemPrompt: string
  messages: TutorMessage[]
  maxTokens: number
  profile: TutorModelProfile
  signal?: AbortSignal
}): AsyncGenerator<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (!apiKey) {
    throw new GeminiStreamError(
      'GEMINI_NOT_CONFIGURED',
      503,
      false,
      'The Gemini provider is not configured on this deployment.',
    )
  }

  const model = input.profile === 'quality'
    ? process.env.GEMINI_MODEL?.trim() || DEFAULT_QUALITY_MODEL
    : process.env.GEMINI_FAST_MODEL?.trim() || DEFAULT_FAST_MODEL
  const timeoutMs = readPositiveInt(process.env.GEMINI_TIMEOUT_MS, 45_000, 8_000, 55_000)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort('timeout'), timeoutMs)
  const abortFromCaller = () => controller.abort('external_abort')
  input.signal?.addEventListener('abort', abortFromCaller, { once: true })

  try {
    const response = await fetch(
      `${API_BASE}/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`,
      {
        method: 'POST',
        headers: {
          'x-goog-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: input.systemPrompt }] },
          contents: normaliseMessages(input.messages),
          generationConfig: {
            temperature: 0.3,
            topP: 0.9,
            maxOutputTokens: Math.max(128, Math.min(input.maxTokens, 8_192)),
          },
        }),
        cache: 'no-store',
        signal: controller.signal,
      },
    )

    if (!response.ok) {
      const detail = (await response.text().catch(() => '')).slice(0, 400)
      const retryable = response.status === 408 || response.status === 429 || response.status >= 500
      throw new GeminiStreamError(
        `GEMINI_HTTP_${response.status}`,
        response.status,
        retryable,
        safeProviderMessage(response.status, detail),
      )
    }
    if (!response.body) {
      throw new GeminiStreamError('GEMINI_EMPTY_STREAM', 502, true, 'Gemini returned an empty response.')
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
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
          }
          for (const part of event.candidates?.[0]?.content?.parts ?? []) {
            if (part.text) yield part.text
          }
        } catch {
          // Ignore malformed keep-alive fragments and continue the valid stream.
        }
      }
    }
  } catch (error) {
    if (error instanceof GeminiStreamError) throw error
    if (input.signal?.aborted) {
      throw new GeminiStreamError('REQUEST_ABORTED', 499, false, 'The response was stopped.')
    }
    if (controller.signal.aborted) {
      throw new GeminiStreamError('GEMINI_TIMEOUT', 504, true, 'Gemini took too long to respond.')
    }
    throw new GeminiStreamError('GEMINI_NETWORK_ERROR', 502, true, 'Gemini is temporarily unreachable.')
  } finally {
    clearTimeout(timeout)
    input.signal?.removeEventListener('abort', abortFromCaller)
  }
}

function normaliseMessages(messages: TutorMessage[]) {
  const recent = messages.slice(-14)
  const output: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = []
  let totalChars = 0
  for (const message of recent.reverse()) {
    const content = message.content.trim().slice(0, 12_000)
    if (!content) continue
    if (totalChars + content.length > 42_000) break
    output.unshift({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: content }],
    })
    totalChars += content.length
  }
  return output
}

function safeProviderMessage(status: number, detail: string) {
  if (status === 401 || status === 403) return 'Gemini credentials are not accepted on this deployment.'
  if (status === 404 || /model/i.test(detail)) return 'The configured Gemini model is unavailable.'
  if (status === 429) return 'Gemini is receiving too many requests.'
  if (status >= 500) return 'Gemini is temporarily unavailable.'
  return 'Gemini could not complete this request.'
}

function readPositiveInt(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback
}

import 'server-only'

import type {
  AiProvider,
  Citation,
  EvaluationRequest,
  EvaluationResponse,
  GroundingStatus,
  HintRequest,
  SpeechRequest,
  TranscriptionRequest,
  TutorMessage,
  TutorRequest,
  TutorResponse,
} from '@/lib/ai/groq-provider'

import {
  fallbackTutorResponse,
  mapCitationsToAnswer,
  polishTutorContent,
} from '@/lib/ai/groq-provider'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta'

const DEFAULT_PRIMARY_MODEL = 'gemini-2.0-flash'
const DEFAULT_FAST_MODEL = 'gemini-2.0-flash-lite'
const DEFAULT_DEEP_MODEL = 'gemini-1.5-pro'

const DEFAULT_TIMEOUT_MS = 28_000
const STREAM_TIMEOUT_MS = 35_000

const PROVIDER_NAME = 'gemini' as const

// ---------------------------------------------------------------------------
// Gemini request / response shapes (subset of the v1beta Generative Language API)
// ---------------------------------------------------------------------------

type GeminiPart = { text: string }

type GeminiContent = {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

type GeminiGenerationConfig = {
  temperature?: number
  topP?: number
  maxOutputTokens?: number
  responseMimeType?: string
}

type GeminiGenerateRequest = {
  contents: GeminiContent[]
  systemInstruction?: { parts: GeminiPart[] }
  generationConfig?: GeminiGenerationConfig
}

type GeminiCandidate = {
  content?: { parts?: GeminiPart[] | null }
  finishReason?: string
}

type GeminiGenerateResponse = {
  candidates?: GeminiCandidate[] | null
  promptFeedback?: unknown
}

type GeminiStreamChunk = GeminiGenerateResponse

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export class GeminiProvider implements AiProvider {
  public readonly providerName: typeof PROVIDER_NAME = PROVIDER_NAME

  private readonly apiKey: string
  private readonly model: string
  private readonly fastModel: string
  private readonly deepModel: string
  private readonly timeoutMs: number

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY?.trim() || ''
    this.model = process.env.GEMINI_MODEL?.trim() || DEFAULT_PRIMARY_MODEL
    this.fastModel = process.env.GEMINI_FAST_MODEL?.trim() || DEFAULT_FAST_MODEL
    this.deepModel = process.env.GEMINI_DEEP_MODEL?.trim() || DEFAULT_DEEP_MODEL
    this.timeoutMs = readPositiveInt(process.env.GEMINI_TIMEOUT_MS, DEFAULT_TIMEOUT_MS, 5_000, 55_000)
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey)
  }

  // -------------------------------------------------------------------------
  // chat — non-streaming tutor call
  // -------------------------------------------------------------------------

  async chat(input: TutorRequest): Promise<TutorResponse> {
    const citations: Citation[] = input.citations ?? []

    try {
      this.assertConfigured()

      const response = await this.requestJson<GeminiGenerateResponse>(
        `${this.model}:generateContent`,
        {
          contents: toGeminiContents(input.messages),
          systemInstruction: { parts: [{ text: input.systemPrompt }] },
          generationConfig: {
            temperature: 0.32,
            topP: 0.9,
            maxOutputTokens: clamp(input.maxTokens ?? 1800, 256, 4000),
          },
        },
        input.signal,
      )

      const raw = extractCandidateText(response)
      const content = polishTutorContent(raw)
      if (!content) return fallbackTutorResponse()

      const grounded = mapCitationsToAnswer(content, citations)

      return {
        content: grounded.content,
        groundingStatus: grounded.groundingStatus,
        citations: grounded.citations,
        // Streaming callers rebuild follow-ups from the streamed content; this
        // non-streaming path returns an empty array to stay consistent with the
        // documented contract.
        followUps: [],
        usedFallback: false,
      }
    } catch (error) {
      console.error('[ai:gemini] chat failed:', safeErrorSummary(error))
      return fallbackTutorResponse()
    }
  }

  // -------------------------------------------------------------------------
  // evaluate — rubric JSON evaluation
  // -------------------------------------------------------------------------

  async evaluate(input: EvaluationRequest): Promise<EvaluationResponse> {
    try {
      this.assertConfigured()

      const systemPrompt = buildEvaluatorPrompt(input)
      const userPrompt = `Question (${input.maxMarks} marks):\n${input.question}\n\nStudent answer:\n${input.studentAnswer}`

      const response = await this.requestJson<GeminiGenerateResponse>(
        `${this.model}:generateContent`,
        {
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: {
            temperature: 0.1,
            topP: 0.95,
            maxOutputTokens: 1800,
            responseMimeType: 'application/json',
          },
        },
        input.signal,
      )

      const raw = extractCandidateText(response).trim()
      return parseEvaluationJson(raw, input.maxMarks)
    } catch (error) {
      console.error('[ai:gemini] evaluation failed:', safeErrorSummary(error))
      return fallbackEvaluation(input.maxMarks)
    }
  }

  // -------------------------------------------------------------------------
  // generateHint — fast, single-sentence hint
  // -------------------------------------------------------------------------

  async generateHint(input: HintRequest): Promise<string> {
    const defaultHint =
      'Review the key definition for this topic, then identify what the question is asking you to calculate or explain.'

    try {
      this.assertConfigured()

      const context = input.topic ? `Topic: ${input.topic}\n` : ''
      const attempt = input.studentAnswer ? `Student attempt:\n${input.studentAnswer}\n\n` : ''
      const userPrompt = `${context}${attempt}Question: ${input.question}`

      const response = await this.requestJson<GeminiGenerateResponse>(
        `${this.fastModel}:generateContent`,
        {
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          systemInstruction: {
            parts: [
              {
                text: 'You are LEO, a patient tutor for diploma engineering students. Give exactly one useful hint in no more than two sentences. Do not reveal the final answer. Prefer a guiding question, a formula reminder, or the next reasoning step. Do not use markdown headings.',
              },
            ],
          },
          generationConfig: {
            temperature: 0.25,
            topP: 0.9,
            maxOutputTokens: 180,
          },
        },
        input.signal,
      )

      return extractCandidateText(response).trim() || defaultHint
    } catch (error) {
      console.error('[ai:gemini] hint failed:', safeErrorSummary(error))
      return defaultHint
    }
  }

  // -------------------------------------------------------------------------
  // Speech — Gemini does not provide TTS / ASR. Fail loudly.
  // -------------------------------------------------------------------------

  async synthesizeSpeech(_input: SpeechRequest): Promise<ArrayBuffer> {
    throw new Error('Gemini does not support TTS. Use Groq for speech synthesis.')
  }

  async transcribeSpeech(_input: TranscriptionRequest): Promise<string> {
    throw new Error('Gemini does not support transcription. Use Groq for speech recognition.')
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  private assertConfigured(): void {
    if (!this.apiKey) throw new Error('GEMINI_API_KEY_NOT_CONFIGURED')
  }

  private buildUrl(path: string): string {
    return `${API_BASE}/models/${path}?key=${this.apiKey}`
  }

  private async requestJson<T>(
    path: string,
    body: GeminiGenerateRequest,
    signal?: AbortSignal,
  ): Promise<T> {
    let lastError: unknown

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await this.fetchWithTimeout(
          this.buildUrl(path),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          },
          signal,
        )

        if (response.ok) return (await response.json()) as T

        const error = await this.httpError(response)
        if (
          attempt === 0 &&
          (response.status === 408 ||
            response.status === 409 ||
            response.status === 429 ||
            response.status >= 500)
        ) {
          await sleep(650)
          lastError = error
          continue
        }
        throw error
      } catch (error) {
        lastError = error
        if (attempt === 0 && !signal?.aborted && isRetryableNetworkError(error)) {
          await sleep(350)
          continue
        }
        throw error
      }
    }

    throw lastError instanceof Error ? lastError : new Error('GEMINI_REQUEST_FAILED')
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    externalSignal?: AbortSignal,
  ): Promise<Response> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort('timeout'), this.timeoutMs)
    const abort = () => controller.abort('external_abort')
    externalSignal?.addEventListener('abort', abort, { once: true })

    try {
      return await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' })
    } finally {
      clearTimeout(timer)
      externalSignal?.removeEventListener('abort', abort)
    }
  }

  private async httpError(response: Response): Promise<Error> {
    const text = (await response.text().catch(() => '')).slice(0, 500)
    return new Error(`GEMINI_HTTP_${response.status}${text ? `: ${text}` : ''}`)
  }
}

// ---------------------------------------------------------------------------
// Singleton factory
// ---------------------------------------------------------------------------

let cachedGeminiProvider: GeminiProvider | null = null

export function getGeminiProvider(): GeminiProvider {
  if (!cachedGeminiProvider) cachedGeminiProvider = new GeminiProvider()
  return cachedGeminiProvider
}

export function getGeminiRuntimeStatus(): { configured: boolean; model: string } {
  return {
    configured: Boolean(process.env.GEMINI_API_KEY?.trim()),
    model: process.env.GEMINI_MODEL?.trim() || DEFAULT_PRIMARY_MODEL,
  }
}

// ---------------------------------------------------------------------------
// Streaming — streamGeminiChat
// ---------------------------------------------------------------------------

export async function* streamGeminiChat(input: {
  systemPrompt: string
  messages: TutorMessage[]
  maxTokens: number
  signal?: AbortSignal
}): AsyncGenerator<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (!apiKey) {
    throw new GeminiStreamError(
      'AI_NOT_CONFIGURED',
      503,
      false,
      'LEO is not configured for Gemini on this deployment. Add GEMINI_API_KEY to the active project.',
    )
  }

  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_PRIMARY_MODEL
  const url = `${API_BASE}/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`

  const timeoutMs = readPositiveInt(process.env.GEMINI_TIMEOUT_MS, STREAM_TIMEOUT_MS, 8_000, 55_000)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort('timeout'), timeoutMs)
  const abortFromCaller = () => controller.abort('external_abort')
  input.signal?.addEventListener('abort', abortFromCaller, { once: true })

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: toGeminiContents(input.messages),
        systemInstruction: { parts: [{ text: input.systemPrompt }] },
        generationConfig: {
          temperature: 0.3,
          topP: 0.9,
          maxOutputTokens: clamp(input.maxTokens, 128, 4000),
        },
      } satisfies GeminiGenerateRequest),
      cache: 'no-store',
      signal: controller.signal,
    })

    if (!response.ok) {
      const detail = (await response.text().catch(() => '')).slice(0, 400)
      const retryable =
        response.status === 408 ||
        response.status === 409 ||
        response.status === 429 ||
        response.status >= 500
      throw new GeminiStreamError(
        `GEMINI_HTTP_${response.status}`,
        response.status,
        retryable,
        safeProviderMessage(response.status, detail),
      )
    }

    if (!response.body) {
      throw new GeminiStreamError(
        'EMPTY_STREAM',
        502,
        true,
        'LEO received an empty response from Gemini. Please try again.',
      )
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let yieldedAny = false

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
          const chunk = JSON.parse(data) as GeminiStreamChunk
          const token = extractCandidateText(chunk)
          if (token) {
            yieldedAny = true
            yield token
          }
        } catch {
          // Ignore malformed keep-alive / partial fragments; valid deltas continue.
        }
      }
    }

    if (!yieldedAny) {
      throw new GeminiStreamError(
        'EMPTY_STREAM',
        502,
        true,
        'LEO received an empty response from Gemini. Please try again.',
      )
    }
  } catch (error) {
    if (error instanceof GeminiStreamError) throw error
    if (input.signal?.aborted) {
      throw new GeminiStreamError('REQUEST_ABORTED', 499, false, 'The response was stopped.')
    }
    if (controller.signal.aborted) {
      throw new GeminiStreamError(
        'AI_TIMEOUT',
        504,
        true,
        'LEO took too long to respond. Please retry.',
      )
    }
    throw new GeminiStreamError(
      'AI_NETWORK_ERROR',
      502,
      true,
      'LEO could not reach the Gemini engine. Please retry.',
    )
  } finally {
    clearTimeout(timeout)
    input.signal?.removeEventListener('abort', abortFromCaller)
  }
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function toGeminiContents(messages: TutorMessage[]): GeminiContent[] {
  const recent = messages.slice(-14)
  const output: GeminiContent[] = []
  let totalChars = 0

  for (const message of recent) {
    const content = message.content.trim().slice(0, 12_000)
    if (!content) continue
    if (totalChars + content.length > 48_000) break
    output.push({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: content }],
    })
    totalChars += content.length
  }

  return output
}

function extractCandidateText(response: GeminiGenerateResponse | GeminiStreamChunk): string {
  const candidates = response?.candidates
  if (!Array.isArray(candidates) || candidates.length === 0) return ''
  const parts = candidates[0]?.content?.parts
  if (!Array.isArray(parts) || parts.length === 0) return ''

  return parts
    .map((part) => (part && typeof part.text === 'string' ? part.text : ''))
    .join('')
}

function buildEvaluatorPrompt(input: EvaluationRequest): string {
  const context = [
    input.subject ? `Subject: ${input.subject}` : '',
    input.unit ? `Unit: ${input.unit}` : '',
    input.topic ? `Topic: ${input.topic}` : '',
  ]
    .filter(Boolean)
    .join(' | ')

  return [
    'You are LEO, a strict but constructive diploma-engineering answer evaluator.',
    `Maximum marks: ${input.maxMarks}.`,
    context,
    input.modelAnswer ? `Reference answer:\n${input.modelAnswer}` : '',
    input.keyPoints?.length ? `Required key points:\n- ${input.keyPoints.join('\n- ')}` : '',
    'Award partial credit only for correct and relevant content. Do not reward confident but incorrect claims.',
    'Return only valid JSON with this shape:',
    JSON.stringify({
      estimatedMarks: 0,
      criterionScores: { correctness: 0, completeness: 0, structure: 0, clarity: 0 },
      correctPoints: [],
      missingPoints: [],
      incorrectClaims: [],
      structureFeedback: '',
      suggestedImprovedAnswer: '',
      confidence: 0,
    }),
  ]
    .filter(Boolean)
    .join('\n\n')
}

function parseEvaluationJson(raw: string, maxMarks: number): EvaluationResponse {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  try {
    const object = JSON.parse(cleaned) as Record<string, unknown>
    const scores = (object.criterionScores as Record<string, unknown>) || {}
    return {
      estimatedMarks: clamp(toNumber(object.estimatedMarks, 0), 0, maxMarks),
      criterionScores: {
        correctness: clamp(toNumber(scores.correctness, 0), 0, 10),
        completeness: clamp(toNumber(scores.completeness, 0), 0, 10),
        structure: clamp(toNumber(scores.structure, 0), 0, 10),
        clarity: clamp(toNumber(scores.clarity, 0), 0, 10),
      },
      correctPoints: toStringArray(object.correctPoints),
      missingPoints: toStringArray(object.missingPoints),
      incorrectClaims: toStringArray(object.incorrectClaims),
      structureFeedback: toString(object.structureFeedback, 'No structural feedback.'),
      suggestedImprovedAnswer: toString(
        object.suggestedImprovedAnswer,
        'Review the missing points and try again.',
      ),
      confidence: clamp(toNumber(object.confidence, 0.5), 0, 1),
      estimateLabel: 'AI estimate',
      usedFallback: false,
    }
  } catch {
    return fallbackEvaluation(maxMarks, raw)
  }
}

function fallbackEvaluation(maxMarks: number, raw = ''): EvaluationResponse {
  return {
    estimatedMarks: 0,
    criterionScores: { correctness: 0, completeness: 0, structure: 0, clarity: 0 },
    correctPoints: [],
    missingPoints: ['The evaluation service could not produce a structured result.'],
    incorrectClaims: [],
    structureFeedback: 'Please try the evaluation again.',
    suggestedImprovedAnswer: raw.slice(0, 500) || 'Please try again in a moment.',
    confidence: 0,
    estimateLabel: 'AI estimate',
    usedFallback: true,
  }
}

function safeProviderMessage(status: number, detail: string): string {
  if (status === 401 || status === 403) {
    return 'LEO cannot authenticate with Gemini. Check GEMINI_API_KEY on the active deployment.'
  }
  if (status === 404 || /model/i.test(detail)) {
    return "LEO's configured Gemini model is unavailable. Check GEMINI_MODEL."
  }
  if (status === 429) return 'LEO is receiving too many Gemini requests. Please retry shortly.'
  if (status >= 500) return 'Gemini is temporarily unavailable. Please retry.'
  return 'LEO could not complete this Gemini request. Please try again.'
}

function safeErrorSummary(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message.slice(0, 240)}`
  return String(error).slice(0, 240)
}

function isRetryableNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  return (
    error.name === 'AbortError' ||
    error.message.includes('fetch failed') ||
    error.message.includes('ECONNRESET') ||
    error.message.includes('ETIMEDOUT')
  )
}

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && Number.isFinite(Number(value))) return Number(value)
  return fallback
}

function toString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, 20)
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function readPositiveInt(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.round(clamp(parsed, min, max)) : fallback
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ---------------------------------------------------------------------------
// Re-exports for convenience — callers using gemini-provider can stay here.
// ---------------------------------------------------------------------------

export { fallbackTutorResponse, polishTutorContent, mapCitationsToAnswer }

export type {
  AiProvider,
  Citation,
  EvaluationRequest,
  EvaluationResponse,
  GroundingStatus,
  HintRequest,
  SpeechRequest,
  TranscriptionRequest,
  TutorMessage,
  TutorRequest,
  TutorResponse,
}

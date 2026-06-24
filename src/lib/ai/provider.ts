/**
 * AI Provider abstraction.
 *
 * Server-only. Wraps the underlying LLM (default: z-ai-web-dev-sdk) behind a
 * single `AiProvider` interface so the rest of the app never imports the SDK
 * directly. This lets us swap providers via `LERNIO_AI_PROVIDER` env var,
 * add timeouts / abort / safe fallbacks in ONE place, and keep the SDK out of
 * the client bundle.
 *
 * Trust model:
 *  - The provider NEVER trusts caller-supplied "grounding" claims. Grounding
 *    status is derived from the retrieved chunks passed in by the route layer
 *    (see src/lib/ai/retrieval.ts), not from the model's own self-assessment.
 *  - On any provider failure, `usedFallback=true` and a safe canned message is
 *    returned. Raw error strings are logged server-side only and NEVER sent to
 *    the client.
 */
import 'server-only'
import ZAI from 'z-ai-web-dev-sdk'

// ============================================================
// Public types
// ============================================================

export interface Citation {
  sourceId: string
  title: string
  subject?: string
  unit?: string
  topic?: string
  location?: string
  snippet?: string
}

export type GroundingStatus = 'grounded' | 'partially_grounded' | 'general'

export interface TutorMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface TutorRequest {
  /** Full system prompt (persona + retrieved context + mode instruction). */
  systemPrompt: string
  messages: TutorMessage[]
  maxTokens?: number
  signal?: AbortSignal
  /** Citations the route layer pre-built from retrieved chunks (echoed back). */
  citations?: Citation[]
}

export interface TutorResponse {
  content: string
  groundingStatus: GroundingStatus
  citations: Citation[]
  followUps: string[]
  usedFallback: boolean
}

// ============================================================
// Evaluation types
// ============================================================

export interface EvaluationRequest {
  question: string
  subject?: string
  unit?: string
  topic?: string
  maxMarks: number
  modelAnswer?: string
  keyPoints?: string[]
  studentAnswer: string
  signal?: AbortSignal
}

export interface EvaluationResponse {
  estimatedMarks: number
  criterionScores: Record<string, number>
  correctPoints: string[]
  missingPoints: string[]
  incorrectClaims: string[]
  structureFeedback: string
  suggestedImprovedAnswer: string
  confidence: number
  /** Always "AI estimate" — surfaced to the UI as a disclaimer. */
  estimateLabel: string
  usedFallback: boolean
}

// ============================================================
// Hint types
// ============================================================

export interface HintRequest {
  question: string
  topic?: string
  studentAnswer?: string
  signal?: AbortSignal
}

export interface SpeechRequest {
  text: string
  voice: string
  speed: number
  signal?: AbortSignal
}

export interface TranscriptionRequest {
  fileBase64: string
  signal?: AbortSignal
}

// ============================================================
// Provider interface
// ============================================================

export interface AiProvider {
  chat(input: TutorRequest): Promise<TutorResponse>
  evaluate(input: EvaluationRequest): Promise<EvaluationResponse>
  generateHint(input: HintRequest): Promise<string>
  synthesizeSpeech(input: SpeechRequest): Promise<ArrayBuffer>
  transcribeSpeech(input: TranscriptionRequest): Promise<string>
}

// ============================================================
// Constants
// ============================================================

const DEFAULT_TIMEOUT_MS = 30_000
const SAFE_FALLBACK_MESSAGE =
  'LEO could not connect to the learning engine. Your message is saved. Please try again in a moment.'

// ============================================================
// ZaiProvider — wraps z-ai-web-dev-sdk
// ============================================================

export class ZaiProvider implements AiProvider {
  private timeoutMs: number

  constructor(timeoutMs = DEFAULT_TIMEOUT_MS) {
    this.timeoutMs = timeoutMs
  }

  async chat(input: TutorRequest): Promise<TutorResponse> {
    const citations = input.citations ?? []
    const groundingStatus: GroundingStatus = citations.length > 0 ? 'grounded' : 'general'

    try {
      const zai = await ZAI.create()
      const completion = await this.withTimeout(
        zai.chat.completions.create({
          // The SDK supports a proper `system` role, so we use it instead of
          // smuggling the system prompt into an assistant message (the old
          // behaviour). This gives the model a clearer persona / instruction
          // boundary.
          messages: [
            { role: 'system', content: input.systemPrompt },
            ...input.messages.map((m) => ({ role: m.role, content: m.content })),
          ],
          thinking: { type: 'disabled' },
          ...(input.maxTokens ? { max_tokens: input.maxTokens } : {}),
        }),
        input.signal,
      )

      const content: string = completion?.choices?.[0]?.message?.content ?? ''
      if (!content || !content.trim()) {
        return this.fallbackResponse(groundingStatus, citations)
      }

      return {
        content,
        groundingStatus,
        citations,
        followUps: extractFollowUps(content),
        usedFallback: false,
      }
    } catch (err) {
      // NEVER leak provider errors. Log server-side, return safe message.
      console.error('[ai:provider] chat failed:', safeErrorSummary(err))
      return this.fallbackResponse(groundingStatus, citations)
    }
  }

  async evaluate(input: EvaluationRequest): Promise<EvaluationResponse> {
    const systemPrompt = buildEvaluatorPrompt(input)
    try {
      const zai = await ZAI.create()
      const completion = await this.withTimeout(
        zai.chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: `Question (${input.maxMarks} marks):\n${input.question}\n\nStudent answer:\n${input.studentAnswer}`,
            },
          ],
          thinking: { type: 'disabled' },
        }),
        input.signal,
      )

      const raw: string = completion?.choices?.[0]?.message?.content ?? ''
      const parsed = parseEvaluationJson(raw, input.maxMarks)
      return { ...parsed, estimateLabel: 'AI estimate', usedFallback: false }
    } catch (err) {
      console.error('[ai:provider] evaluate failed:', safeErrorSummary(err))
      return fallbackEvaluation(input.maxMarks)
    }
  }

  async generateHint(input: HintRequest): Promise<string> {
    const ctx = input.topic ? `Topic: ${input.topic}\n` : ''
    const prior = input.studentAnswer ? `Student's current attempt:\n${input.studentAnswer}\n\n` : ''
    try {
      const zai = await ZAI.create()
      const completion = await this.withTimeout(
        zai.chat.completions.create({
          messages: [
            {
              role: 'system',
              content:
                'You are LEO, a learning companion for diploma engineering students. ' +
                'Provide ONE short hint (max 2 sentences) that guides the student toward the answer ' +
                'WITHOUT revealing the answer itself. Ask a guiding question or point to a specific concept. ' +
                'Be encouraging and specific to the topic.',
            },
            {
              role: 'user',
              content: `${ctx}${prior}Question: ${input.question}`,
            },
          ],
          thinking: { type: 'disabled' },
        }),
        input.signal,
      )
      const hint: string = completion?.choices?.[0]?.message?.content ?? ''
      return hint.trim() || 'Hint: review the key definition for this topic and try again.'
    } catch (err) {
      console.error('[ai:provider] hint failed:', safeErrorSummary(err))
      return 'Hint: review the key definition for this topic and try again.'
    }
  }

  async synthesizeSpeech(input: SpeechRequest): Promise<ArrayBuffer> {
    const zai = await ZAI.create()
    const response = await this.withTimeout(
      zai.audio.tts.create({
        input: input.text,
        voice: input.voice,
        speed: input.speed,
        response_format: 'wav',
        stream: false,
      }),
      input.signal,
    )
    return response.arrayBuffer()
  }

  async transcribeSpeech(input: TranscriptionRequest): Promise<string> {
    const zai = await ZAI.create()
    const response = await this.withTimeout(
      zai.audio.asr.create({ file_base64: input.fileBase64 }),
      input.signal,
    )
    return (response?.text ?? '').trim()
  }

  // ----------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------

  private fallbackResponse(
    groundingStatus: GroundingStatus,
    citations: Citation[],
  ): TutorResponse {
    return {
      content: SAFE_FALLBACK_MESSAGE,
      groundingStatus: 'general',
      citations,
      followUps: ['Try asking again', 'Rephrase the question'],
      usedFallback: true,
    }
  }

  /**
   * Race the provider promise against a timeout. Honours an external AbortSignal
   * if the caller passes one (e.g. client disconnect).
   */
  private async withTimeout<T>(promise: Promise<T>, externalSignal?: AbortSignal): Promise<T> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)

    // If the caller's signal aborts, propagate.
    const onExternalAbort = () => controller.abort()
    externalSignal?.addEventListener('abort', onExternalAbort, { once: true })

    try {
      return await new Promise<T>((resolve, reject) => {
        promise.then(resolve, reject)
        controller.signal.addEventListener(
          'abort',
          () => reject(new Error('AI_PROVIDER_TIMEOUT_OR_ABORTED')),
          { once: true },
        )
      })
    } finally {
      clearTimeout(timer)
      externalSignal?.removeEventListener('abort', onExternalAbort)
    }
  }
}

// ============================================================
// Factory
// ============================================================

let cachedProvider: AiProvider | null = null

/**
 * Return the configured AI provider. Reads `LERNIO_AI_PROVIDER` (default 'zai').
 * Cached for the lifetime of the process — providers are stateless wrappers.
 */
export function getAiProvider(): AiProvider {
  if (cachedProvider) return cachedProvider
  const name = (process.env.LERNIO_AI_PROVIDER || 'zai').toLowerCase()
  switch (name) {
    case 'zai':
    default:
      cachedProvider = new ZaiProvider()
      break
  }
  return cachedProvider
}

// ============================================================
// Internal helpers
// ============================================================

/** Reduce any thrown value to a short safe string for server logs. */
function safeErrorSummary(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message.slice(0, 200)}`
  return String(err).slice(0, 200)
}

/**
 * Extract 2-3 follow-up suggestions from the assistant answer.
 * Strategy: pull sentences that look like questions; fall back to generic ones.
 */
function extractFollowUps(content: string): string[] {
  const out: string[] = []
  // Match "??"-terminated sentences (greedy on short ones).
  const matches = content.match(/[^.!?\n]{8,120}\?/g)
  if (matches) {
    for (const m of matches.slice(0, 2)) {
      const cleaned = m.trim().replace(/\s+/g, ' ')
      if (cleaned.length >= 8) out.push(cleaned)
    }
  }
  if (out.length < 2) {
    out.push('Can you give a real-world example?')
    out.push('What are common exam questions on this?')
  }
  return out.slice(0, 3)
}

// ----------------------------------------------------------
// Evaluator prompt + parsing
// ----------------------------------------------------------

function buildEvaluatorPrompt(input: EvaluationRequest): string {
  const ctx: string[] = []
  if (input.subject) ctx.push(`Subject: ${input.subject}`)
  if (input.unit) ctx.push(`Unit: ${input.unit}`)
  if (input.topic) ctx.push(`Topic: ${input.topic}`)
  const ctxStr = ctx.length ? ctx.join(' • ') + '\n\n' : ''

  const rubricLines = [
    `You are LEO, an exam evaluator for diploma engineering students.`,
    `Evaluate the student's answer strictly against the question and rubric.`,
    `Maximum marks for this question: ${input.maxMarks}.`,
    `Be fair but rigorous. Award partial credit only for correct, relevant points.`,
    `If the student's answer is empty or off-topic, award 0.`,
    '',
    ctxStr,
    input.modelAnswer ? `MODEL ANSWER (reference):\n${input.modelAnswer}\n\n` : '',
    input.keyPoints?.length
      ? `KEY POINTS (each worth ~${(input.maxMarks / Math.max(input.keyPoints.length, 1)).toFixed(1)} marks):\n- ${input.keyPoints.join('\n- ')}\n\n`
      : '',
    `Respond with ONLY a JSON object — no markdown, no prose — using this exact shape:`,
    `{`,
    `  "estimatedMarks": <number 0..${input.maxMarks}>,`,
    `  "criterionScores": { "correctness": <0-10>, "completeness": <0-10>, "structure": <0-10>, "clarity": <0-10> },`,
    `  "correctPoints": [<string>, ...],`,
    `  "missingPoints": [<string>, ...],`,
    `  "incorrectClaims": [<string>, ...],`,
    `  "structureFeedback": <string>,`,
    `  "suggestedImprovedAnswer": <string>,`,
    `  "confidence": <0..1>`,
    `}`,
  ]
  return rubricLines.join('\n')
}

function parseEvaluationJson(raw: string, maxMarks: number): EvaluationResponse {
  // Strip ```json fences if the model wrapped output.
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  let obj: Record<string, unknown> = {}
  try {
    obj = JSON.parse(cleaned)
  } catch {
    // Model returned prose; degrade gracefully.
    return fallbackEvaluation(maxMarks, raw)
  }

  const estimatedMarks = clamp(
    toNumber(obj.estimatedMarks, 0),
    0,
    maxMarks,
  )
  const criterionScores: Record<string, number> = {}
  const cs = (obj.criterionScores as Record<string, unknown>) || {}
  for (const k of ['correctness', 'completeness', 'structure', 'clarity']) {
    criterionScores[k] = clamp(toNumber(cs[k], 0), 0, 10)
  }
  const correctPoints = toStringArray(obj.correctPoints)
  const missingPoints = toStringArray(obj.missingPoints)
  const incorrectClaims = toStringArray(obj.incorrectClaims)
  const structureFeedback = toStr(obj.structureFeedback, 'No structural feedback.')
  const suggestedImprovedAnswer = toStr(
    obj.suggestedImprovedAnswer,
    'Review the key points and try again.',
  )
  const confidence = clamp(toNumber(obj.confidence, 0.3), 0, 1)

  return {
    estimatedMarks,
    criterionScores,
    correctPoints,
    missingPoints,
    incorrectClaims,
    structureFeedback,
    suggestedImprovedAnswer,
    confidence,
    estimateLabel: 'AI estimate',
    usedFallback: false,
  }
}

function fallbackEvaluation(maxMarks: number, raw?: string): EvaluationResponse {
  return {
    estimatedMarks: 0,
    criterionScores: { correctness: 0, completeness: 0, structure: 0, clarity: 0 },
    correctPoints: [],
    missingPoints: ['Could not parse the evaluation. Please try again.'],
    incorrectClaims: [],
    structureFeedback: 'Evaluation unavailable right now.',
    suggestedImprovedAnswer: raw?.slice(0, 500) || 'Please try again in a moment.',
    confidence: 0,
    estimateLabel: 'AI estimate',
    usedFallback: true,
  }
}

function toNumber(v: unknown, dflt: number): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return dflt
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

function toStr(v: unknown, dflt: string): string {
  return typeof v === 'string' && v.trim() ? v : dflt
}

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    .map((x) => x.trim())
    .slice(0, 20)
}

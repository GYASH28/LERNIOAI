import 'server-only'

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
  systemPrompt: string
  messages: TutorMessage[]
  maxTokens?: number
  signal?: AbortSignal
  citations?: Citation[]
}

export interface TutorResponse {
  content: string
  groundingStatus: GroundingStatus
  citations: Citation[]
  followUps: string[]
  usedFallback: boolean
}

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
  estimateLabel: string
  usedFallback: boolean
}

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

export interface AiProvider {
  chat(input: TutorRequest): Promise<TutorResponse>
  evaluate(input: EvaluationRequest): Promise<EvaluationResponse>
  generateHint(input: HintRequest): Promise<string>
  synthesizeSpeech(input: SpeechRequest): Promise<ArrayBuffer>
  transcribeSpeech(input: TranscriptionRequest): Promise<string>
}

type GroqChatResponse = {
  choices?: Array<{ message?: { content?: string | null } }>
}

type GroqTranscriptionResponse = { text?: string }

const API_BASE = 'https://api.groq.com/openai/v1'
const DEFAULT_MODEL = 'llama-3.3-70b-versatile'
const DEFAULT_FAST_MODEL = 'llama-3.1-8b-instant'
const DEFAULT_TRANSCRIPTION_MODEL = 'whisper-large-v3-turbo'
const DEFAULT_TTS_MODEL = 'canopylabs/orpheus-v1-english'
const SAFE_FALLBACK_MESSAGE =
  'LEO could not reach the learning engine right now. Your message is safe - please try again in a moment.'

const VALID_TTS_VOICES = new Set(['autumn', 'diana', 'hannah', 'austin', 'daniel', 'troy'])

export class GroqProvider implements AiProvider {
  private readonly apiKey: string
  private readonly model: string
  private readonly fastModel: string
  private readonly transcriptionModel: string
  private readonly ttsModel: string
  private readonly timeoutMs: number

  constructor() {
    this.apiKey = process.env.GROQ_API_KEY?.trim() || ''
    this.model = process.env.GROQ_MODEL?.trim() || DEFAULT_MODEL
    this.fastModel = process.env.GROQ_FAST_MODEL?.trim() || DEFAULT_FAST_MODEL
    this.transcriptionModel =
      process.env.GROQ_TRANSCRIPTION_MODEL?.trim() || DEFAULT_TRANSCRIPTION_MODEL
    this.ttsModel = process.env.GROQ_TTS_MODEL?.trim() || DEFAULT_TTS_MODEL
    this.timeoutMs = readPositiveInt(process.env.GROQ_TIMEOUT_MS, 28_000, 5_000, 55_000)
  }

  async chat(input: TutorRequest): Promise<TutorResponse> {
    const citations = input.citations ?? []
    const groundingStatus: GroundingStatus = citations.length > 0 ? 'grounded' : 'general'

    try {
      this.assertConfigured()
      const response = await this.requestJson<GroqChatResponse>(
        '/chat/completions',
        {
          model: this.model,
          messages: [
            { role: 'system', content: input.systemPrompt },
            ...normaliseMessages(input.messages),
          ],
          temperature: 0.32,
          top_p: 0.9,
          max_completion_tokens: clamp(input.maxTokens ?? 1800, 256, 4000),
        },
        input.signal,
      )

      const content = polishTutorContent(response.choices?.[0]?.message?.content || '')
      if (!content) return fallbackTutorResponse(groundingStatus, citations)

      return {
        content,
        groundingStatus,
        citations,
        followUps: buildFollowUps(content),
        usedFallback: false,
      }
    } catch (error) {
      console.error('[ai:groq] chat failed:', safeErrorSummary(error))
      return fallbackTutorResponse(groundingStatus, citations)
    }
  }

  async evaluate(input: EvaluationRequest): Promise<EvaluationResponse> {
    try {
      this.assertConfigured()
      const response = await this.requestJson<GroqChatResponse>(
        '/chat/completions',
        {
          model: this.model,
          messages: [
            { role: 'system', content: buildEvaluatorPrompt(input) },
            {
              role: 'user',
              content: `Question (${input.maxMarks} marks):\n${input.question}\n\nStudent answer:\n${input.studentAnswer}`,
            },
          ],
          temperature: 0.1,
          max_completion_tokens: 1800,
          response_format: { type: 'json_object' },
        },
        input.signal,
      )
      const raw = response.choices?.[0]?.message?.content?.trim() || ''
      return parseEvaluationJson(raw, input.maxMarks)
    } catch (error) {
      console.error('[ai:groq] evaluation failed:', safeErrorSummary(error))
      return fallbackEvaluation(input.maxMarks)
    }
  }

  async generateHint(input: HintRequest): Promise<string> {
    try {
      this.assertConfigured()
      const context = input.topic ? `Topic: ${input.topic}\n` : ''
      const attempt = input.studentAnswer
        ? `Student attempt:\n${input.studentAnswer}\n\n`
        : ''
      const response = await this.requestJson<GroqChatResponse>(
        '/chat/completions',
        {
          model: this.fastModel,
          messages: [
            {
              role: 'system',
              content:
                'You are LEO, a patient tutor for diploma engineering students. Give exactly one useful hint in no more than two sentences. Do not reveal the final answer. Prefer a guiding question, a formula reminder, or the next reasoning step. Do not use markdown headings.',
            },
            { role: 'user', content: `${context}${attempt}Question: ${input.question}` },
          ],
          temperature: 0.25,
          max_completion_tokens: 180,
        },
        input.signal,
      )
      return (
        response.choices?.[0]?.message?.content?.trim() ||
        'Review the key definition for this topic, then identify what the question is asking you to calculate or explain.'
      )
    } catch (error) {
      console.error('[ai:groq] hint failed:', safeErrorSummary(error))
      return 'Review the key definition for this topic, then identify what the question is asking you to calculate or explain.'
    }
  }

  async synthesizeSpeech(input: SpeechRequest): Promise<ArrayBuffer> {
    this.assertConfigured()
    const voice = VALID_TTS_VOICES.has(input.voice) ? input.voice : 'hannah'
    const spokenText = cleanSpeechText(input.text).slice(0, 200)
    if (!spokenText) throw new Error('EMPTY_TTS_INPUT')

    const response = await this.requestRaw(
      '/audio/speech',
      {
        model: this.ttsModel,
        input: spokenText,
        voice,
        response_format: 'wav',
      },
      input.signal,
    )
    return response.arrayBuffer()
  }

  async transcribeSpeech(input: TranscriptionRequest): Promise<string> {
    this.assertConfigured()
    const base64 = input.fileBase64.replace(/^data:audio\/[a-zA-Z0-9.+-]+;base64,/, '')
    const bytes = Buffer.from(base64, 'base64')
    if (!bytes.length) throw new Error('EMPTY_AUDIO')

    const form = new FormData()
    form.append('file', new Blob([new Uint8Array(bytes)], { type: 'audio/webm' }), 'voice.webm')
    form.append('model', this.transcriptionModel)
    form.append('response_format', 'json')
    form.append('temperature', '0')

    const response = await this.fetchWithTimeout(
      `${API_BASE}/audio/transcriptions`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiKey}` },
        body: form,
      },
      input.signal,
    )

    if (!response.ok) throw await this.httpError(response)
    const data = (await response.json()) as GroqTranscriptionResponse
    return data.text?.trim() || ''
  }

  private assertConfigured() {
    if (!this.apiKey) throw new Error('GROQ_API_KEY_NOT_CONFIGURED')
  }

  private async requestJson<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
    const response = await this.requestRaw(path, body, signal)
    return (await response.json()) as T
  }

  private async requestRaw(path: string, body: unknown, signal?: AbortSignal): Promise<Response> {
    let lastError: unknown
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await this.fetchWithTimeout(
          `${API_BASE}${path}`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          },
          signal,
        )
        if (response.ok) return response

        const error = await this.httpError(response)
        if (attempt === 0 && (response.status === 429 || response.status >= 500)) {
          await sleep(650)
          lastError = error
          continue
        }
        throw error
      } catch (error) {
        lastError = error
        if (attempt === 0 && !signal?.aborted) {
          await sleep(350)
          continue
        }
      }
    }
    throw lastError instanceof Error ? lastError : new Error('GROQ_REQUEST_FAILED')
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
    return new Error(`GROQ_HTTP_${response.status}${text ? `: ${text}` : ''}`)
  }
}

let cachedProvider: AiProvider | null = null

export function getAiProvider(): AiProvider {
  if (!cachedProvider) cachedProvider = new GroqProvider()
  return cachedProvider
}

function normaliseMessages(messages: TutorMessage[]): Array<{ role: 'user' | 'assistant'; content: string }> {
  const recent = messages.slice(-14)
  const output: Array<{ role: 'user' | 'assistant'; content: string }> = []
  let totalChars = 0

  for (const message of recent.reverse()) {
    const content = message.content.trim().slice(0, 12_000)
    if (!content) continue
    if (totalChars + content.length > 48_000) break
    output.unshift({ role: message.role, content })
    totalChars += content.length
  }
  return output
}

function fallbackTutorResponse(
  groundingStatus: GroundingStatus,
  citations: Citation[],
): TutorResponse {
  return {
    content: SAFE_FALLBACK_MESSAGE,
    groundingStatus,
    citations,
    followUps: ['Try again', 'Ask in simpler words'],
    usedFallback: true,
  }
}

export function polishTutorContent(value: string): string {
  const withoutAiPhrases = value
    .replace(/\bAs an AI(?: language model)?[,]?\s*/gi, '')
    .replace(/\bI am an AI(?: language model)?[,]?\s*/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return stripThinkingPreface(withoutAiPhrases).trim()
}

function stripThinkingPreface(value: string): string {
  const lines = value.split(/\r?\n/)
  const firstMeaningfulLine = lines.findIndex((line) => line.trim().length > 0)
  if (firstMeaningfulLine === -1) return ''

  const first = lines[firstMeaningfulLine].trim()
  if (!/^(thinking|reasoning|chain of thought)\s*:/i.test(first)) return value

  const nextAnswerLine = lines.findIndex((line, index) => {
    if (index <= firstMeaningfulLine) return false
    const trimmed = line.trim()
    if (!trimmed) return false
    return (
      /^#{1,4}\s+\S/.test(trimmed) ||
      /^\*\*[^*]+:\*\*/.test(trimmed) ||
      /^(meaning|answer|how it works|example|exam tip|quick recap|the key idea)\b/i.test(trimmed)
    )
  })

  if (nextAnswerLine === -1) {
    return lines
      .slice(firstMeaningfulLine)
      .join('\n')
      .replace(/^(thinking|reasoning|chain of thought)\s*:\s*/i, '')
      .trim()
  }

  return lines.slice(nextAnswerLine).join('\n').trim()
}

function buildFollowUps(content: string): string[] {
  const questions = content
    .match(/[^.!?\n]{8,110}\?/g)
    ?.map((item) => item.trim().replace(/\s+/g, ' '))
    .filter((item) => item.length >= 8)
    .slice(0, 2) ?? []

  const defaults = [
    'Give me a simple real-world example.',
    'Turn this into a 5-mark exam answer.',
    'Quiz me with one question.',
  ]
  return [...questions, ...defaults].filter((value, index, arr) => arr.indexOf(value) === index).slice(0, 3)
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

function cleanSpeechText(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, ' code example omitted ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/[*_#>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function safeErrorSummary(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message.slice(0, 240)}`
  return String(error).slice(0, 240)
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

function readPositiveInt(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.round(clamp(parsed, min, max)) : fallback
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

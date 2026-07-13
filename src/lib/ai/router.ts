import 'server-only'

// ---------------------------------------------------------------------------
// Intelligent AI router — chooses between Gemini (reasoning) and Groq
// (low-latency) with a per-provider circuit breaker and one-shot fallback.
// ---------------------------------------------------------------------------

import { GroqStreamError, streamGroqChat } from '@/lib/ai/groq-stream'
import {
  GeminiStreamError,
  getGeminiProvider,
  streamGeminiChat,
} from '@/lib/ai/gemini-provider'
import {
  getAiProvider,
  type Citation,
  type TutorMessage,
  type TutorRequest,
} from '@/lib/ai/groq-provider'

export type ProviderName = 'gemini' | 'groq'

export interface RouterHealth {
  gemini: {
    configured: boolean
    circuitOpen: boolean
    consecutiveFailures: number
    lastFailureAt: number | null
  }
  groq: {
    configured: boolean
    circuitOpen: boolean
    consecutiveFailures: number
    lastFailureAt: number | null
  }
}

export interface RouteDecision {
  primary: ProviderName
  fallback: ProviderName | null
  reason: string
}

// ---------------------------------------------------------------------------
// Circuit breaker state — module-level, in-memory (one process).
// ---------------------------------------------------------------------------

type CircuitState = {
  failures: number
  lastFailureAt: number
  openUntil: number
}

const circuits: Record<ProviderName, CircuitState> = {
  gemini: { failures: 0, lastFailureAt: 0, openUntil: 0 },
  groq: { failures: 0, lastFailureAt: 0, openUntil: 0 },
}

const CIRCUIT_THRESHOLD = 3
const CIRCUIT_COOLDOWN_MS = 60_000

/**
 * Returns true if the provider's circuit is currently OPEN (calls should be
 * blocked). When the cooldown has expired, this flips the circuit into a
 * half-open state by clearing `openUntil` so that exactly one probe request
 * is allowed through.
 */
function isCircuitOpen(provider: ProviderName, now: number = Date.now()): boolean {
  const c = circuits[provider]
  if (c.openUntil > now) return true
  // Half-open: cooldown expired → allow one attempt
  if (c.openUntil > 0 && c.openUntil <= now) {
    c.openUntil = 0
    return false
  }
  return false
}

function recordSuccess(provider: ProviderName): void {
  circuits[provider] = { failures: 0, lastFailureAt: 0, openUntil: 0 }
}

function recordFailure(provider: ProviderName, now: number = Date.now()): void {
  const c = circuits[provider]
  c.failures += 1
  c.lastFailureAt = now
  if (c.failures >= CIRCUIT_THRESHOLD && c.openUntil === 0) {
    c.openUntil = now + CIRCUIT_COOLDOWN_MS
    console.warn(
      `[ai:router] circuit OPEN for ${provider} after ${c.failures} consecutive failures; cooldown ${CIRCUIT_COOLDOWN_MS}ms`,
    )
  }
}

export function getRouterHealth(): RouterHealth {
  const now = Date.now()
  return {
    gemini: {
      configured: Boolean(process.env.GEMINI_API_KEY?.trim()),
      circuitOpen: circuits.gemini.openUntil > now,
      consecutiveFailures: circuits.gemini.failures,
      lastFailureAt: circuits.gemini.lastFailureAt || null,
    },
    groq: {
      configured: Boolean(process.env.GROQ_API_KEY?.trim()),
      circuitOpen: circuits.groq.openUntil > now,
      consecutiveFailures: circuits.groq.failures,
      lastFailureAt: circuits.groq.lastFailureAt || null,
    },
  }
}

// ---------------------------------------------------------------------------
// Routing decision
// ---------------------------------------------------------------------------

/**
 * Modes that benefit from Gemini's deeper reasoning. Everything else defaults
 * to Groq for low-latency streaming.
 */
const DEEP_MODES = new Set<string>([
  'explain_deep',
  'exam_answer',
  'compare_concepts',
  'summarise_material',
  'review_weak_topics',
  'build_study_plan',
  'check_answer',
])

export function decideRoute(mode: string): RouteDecision {
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY?.trim())
  const groqConfigured = Boolean(process.env.GROQ_API_KEY?.trim())
  const geminiAvailable = geminiConfigured && !isCircuitOpen('gemini')
  const groqAvailable = groqConfigured && !isCircuitOpen('groq')

  // Neither configured (or both circuits open)
  if (!geminiAvailable && !groqAvailable) {
    return {
      primary: geminiConfigured ? 'gemini' : 'groq',
      fallback: null,
      reason: 'no provider available',
    }
  }

  // Only one available
  if (!geminiAvailable) {
    return {
      primary: 'groq',
      fallback: null,
      reason: 'gemini unavailable (not configured or circuit open)',
    }
  }
  if (!groqAvailable) {
    return {
      primary: 'gemini',
      fallback: null,
      reason: 'groq unavailable (not configured or circuit open)',
    }
  }

  // Both available — route by mode
  if (DEEP_MODES.has(mode)) {
    return {
      primary: 'gemini',
      fallback: 'groq',
      reason: 'deep reasoning mode → gemini primary',
    }
  }

  // Low-latency modes → Groq primary (faster streaming), Gemini fallback
  return {
    primary: 'groq',
    fallback: 'gemini',
    reason: 'low-latency mode → groq primary',
  }
}

// ---------------------------------------------------------------------------
// Streaming router
// ---------------------------------------------------------------------------

export interface StreamChatInput {
  systemPrompt: string
  messages: TutorMessage[]
  maxTokens: number
  mode: string
  signal?: AbortSignal
  /** Groq-only: 'fast' uses the small model, 'quality' uses the large model. */
  profile?: 'fast' | 'quality'
}

/**
 * Stream chat tokens from the best provider for the given mode. Falls back to
 * the secondary provider on a retryable error — but ONLY if the primary has
 * not yet yielded any tokens (otherwise the consumer would see a garbled
 * mixed response).
 */
export async function* streamChat(
  input: StreamChatInput,
): AsyncGenerator<string, void, unknown> {
  const decision = decideRoute(input.mode)
  const tried = new Set<ProviderName>()

  const tryProvider = async function* (
    provider: ProviderName,
  ): AsyncGenerator<string> {
    tried.add(provider)
    if (provider === 'gemini') {
      yield* streamGeminiChat({
        systemPrompt: input.systemPrompt,
        messages: input.messages,
        maxTokens: input.maxTokens,
        signal: input.signal,
      })
      return
    }
    yield* streamGroqChat({
      systemPrompt: input.systemPrompt,
      messages: input.messages,
      maxTokens: input.maxTokens,
      profile: input.profile || 'quality',
      signal: input.signal,
    })
  }

  // Try primary — track whether we've yielded anything so we can avoid
  // garbling the response by switching providers mid-stream.
  let primaryYieldedAny = false
  try {
    for await (const token of tryProvider(decision.primary)) {
      primaryYieldedAny = true
      yield token
    }
    recordSuccess(decision.primary)
    return
  } catch (err) {
    recordFailure(decision.primary)

    // If we already streamed tokens, do NOT switch providers — the consumer
    // would see a broken mixed response. Surface the original error instead.
    if (primaryYieldedAny) throw err

    if (!decision.fallback || tried.has(decision.fallback)) throw err
    if (!isRetryableError(err)) throw err
    // Fall through to fallback below.
    console.warn(
      `[ai:router] primary ${decision.primary} failed (${errorSummary(err)}); falling back to ${decision.fallback}`,
    )
  }

  // Try fallback (only reached when primary failed before yielding and error was retryable)
  const fallback = decision.fallback as ProviderName
  try {
    yield* tryProvider(fallback)
    recordSuccess(fallback)
  } catch (err) {
    recordFailure(fallback)
    throw err
  }
}

// ---------------------------------------------------------------------------
// Non-streaming chat router (used by evaluate / hint / fallback paths)
// ---------------------------------------------------------------------------

export interface RoutedChatInput {
  systemPrompt: string
  messages: TutorMessage[]
  maxTokens?: number
  mode: string
  signal?: AbortSignal
  citations?: Array<{
    sourceId: string
    title: string
    location?: string
    subject?: string
    unit?: string
    topic?: string
    snippet?: string
  }>
}

export interface RoutedChatResult {
  content: string
  provider: ProviderName
  usedFallback: boolean
}

/**
 * Non-streaming chat through the router. Delegates to the singleton
 * `GeminiProvider` / `GroqProvider` instances. Since both providers swallow
 * internal errors and return a fallback `TutorResponse` (with `usedFallback:
 * true`), we treat `usedFallback === true` as a failure for circuit-breaker
 * accounting and retry on the secondary provider.
 */
export async function routedChat(input: RoutedChatInput): Promise<RoutedChatResult> {
  const decision = decideRoute(input.mode)
  const tried = new Set<ProviderName>()

  const citations: Citation[] = (input.citations ?? []).map((c) => ({
    sourceId: c.sourceId,
    title: c.title,
    location: c.location,
    subject: c.subject,
    unit: c.unit,
    topic: c.topic,
    snippet: c.snippet,
  }))

  const buildRequest = (): TutorRequest => ({
    systemPrompt: input.systemPrompt,
    messages: input.messages,
    maxTokens: input.maxTokens,
    signal: input.signal,
    citations,
  })

  const tryProvider = async (
    provider: ProviderName,
  ): Promise<{ content: string; usedFallback: boolean }> => {
    tried.add(provider)
    if (provider === 'gemini') {
      const result = await getGeminiProvider().chat(buildRequest())
      return { content: result.content, usedFallback: result.usedFallback }
    }
    const result = await getAiProvider().chat(buildRequest())
    return { content: result.content, usedFallback: result.usedFallback }
  }

  // Try primary
  try {
    const result = await tryProvider(decision.primary)
    if (!result.usedFallback) {
      recordSuccess(decision.primary)
      return {
        content: result.content,
        provider: decision.primary,
        usedFallback: false,
      }
    }
    // Provider returned its own fallback message — treat as a failure for
    // circuit-breaker accounting, then try the secondary if possible.
    recordFailure(decision.primary)
  } catch (err) {
    recordFailure(decision.primary)
    if (!decision.fallback || tried.has(decision.fallback)) throw err
    if (!isRetryableError(err)) throw err
  }

  // Try fallback
  if (decision.fallback && !tried.has(decision.fallback)) {
    const fallback = decision.fallback
    try {
      const result = await tryProvider(fallback)
      if (!result.usedFallback) {
        recordSuccess(fallback)
        return {
          content: result.content,
          provider: fallback,
          usedFallback: true,
        }
      }
      recordFailure(fallback)
    } catch (err) {
      recordFailure(fallback)
      throw err
    }
  }

  // Both providers failed (or no fallback was available)
  return {
    content:
      'LEO could not reach the learning engine right now. Please try again in a moment.',
    provider: decision.primary,
    usedFallback: true,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isRetryableError(err: unknown): boolean {
  if (err instanceof GroqStreamError) return err.retryable
  if (err instanceof GeminiStreamError) return err.retryable
  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    return (
      msg.includes('timeout') ||
      msg.includes('network') ||
      msg.includes('fetch') ||
      msg.includes('econnreset') ||
      msg.includes('etimedout')
    )
  }
  return false
}

function errorSummary(err: unknown): string {
  if (err instanceof Error) {
    return `${err.name}: ${err.message.slice(0, 180)}`
  }
  return String(err).slice(0, 180)
}

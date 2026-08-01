import 'server-only'

import type { TutorMessage } from '@/lib/ai/provider'
import type { TutorModelProfile } from '@/lib/ai/tutor-runtime'
import { getGroqRuntimeStatus, GroqStreamError, streamGroqChat } from '@/lib/ai/groq-stream'
import { GeminiStreamError, getGeminiRuntimeStatus, streamGeminiChat } from '@/lib/ai/gemini-stream'

export type StreamingProviderName = 'groq' | 'gemini'

const circuitState = new Map<StreamingProviderName, { failures: number; openUntil: number }>()
const CIRCUIT_FAILURE_THRESHOLD = 3
const CIRCUIT_OPEN_MS = 60_000

export class AiRouterError extends Error {
  constructor(
    public code: string,
    public status: number,
    public retryable: boolean,
    message: string,
  ) {
    super(message)
    this.name = 'AiRouterError'
  }
}

export function getStreamingProviderOrder(profile: TutorModelProfile): StreamingProviderName[] {
  const configured = {
    groq: getGroqRuntimeStatus().configured,
    gemini: getGeminiRuntimeStatus().configured,
  }
  const requested = (profile === 'quality'
    ? process.env.AI_QUALITY_PROVIDER
    : process.env.AI_FAST_PROVIDER)?.trim().toLowerCase()
  const preferred: StreamingProviderName = requested === 'groq' || requested === 'gemini'
    ? requested
    : profile === 'quality' && configured.gemini
      ? 'gemini'
      : 'groq'
  const alternate: StreamingProviderName = preferred === 'groq' ? 'gemini' : 'groq'
  return [preferred, alternate].filter((provider) => configured[provider])
}

export async function* streamTutorChat(input: {
  systemPrompt: string
  messages: TutorMessage[]
  maxTokens: number
  profile: TutorModelProfile
  signal?: AbortSignal
}): AsyncGenerator<string> {
  const providers = getStreamingProviderOrder(input.profile).filter((provider) => !isCircuitOpen(provider))
  if (providers.length === 0) {
    throw new AiRouterError(
      'AI_NOT_CONFIGURED',
      503,
      false,
      'LEO is not configured on this deployment yet. Add a supported AI provider key.',
    )
  }

  let lastError: unknown = null
  for (let index = 0; index < providers.length; index += 1) {
    const provider = providers[index]
    let emitted = false
    try {
      const stream = provider === 'groq' ? streamGroqChat(input) : streamGeminiChat(input)
      for await (const token of stream) {
        emitted = true
        yield token
      }
      resetCircuit(provider)
      return
    } catch (error) {
      lastError = error
      noteFailure(provider)
      const mayFallback = index < providers.length - 1 && !emitted && !input.signal?.aborted
      if (!mayFallback) throw normaliseRouterError(error)
      console.warn('[leo:provider-fallback]', {
        failedProvider: provider,
        fallbackProvider: providers[index + 1],
        code: errorCode(error),
      })
    }
  }
  throw normaliseRouterError(lastError)
}

function normaliseRouterError(error: unknown) {
  if (error instanceof AiRouterError) return error
  if (error instanceof GroqStreamError || error instanceof GeminiStreamError) {
    return new AiRouterError(error.code, error.status, error.retryable, error.message)
  }
  return new AiRouterError('AI_UNAVAILABLE', 502, true, 'LEO could not complete this request.')
}

function errorCode(error: unknown) {
  return error && typeof error === 'object' && 'code' in error ? String(error.code) : 'UNKNOWN'
}

function isCircuitOpen(provider: StreamingProviderName) {
  const state = circuitState.get(provider)
  if (!state) return false
  if (state.openUntil === 0) return false
  if (state.openUntil <= Date.now()) {
    circuitState.delete(provider)
    return false
  }
  return true
}

function noteFailure(provider: StreamingProviderName) {
  const previous = circuitState.get(provider)
  const failures = (previous?.failures ?? 0) + 1
  circuitState.set(provider, {
    failures,
    openUntil: failures >= CIRCUIT_FAILURE_THRESHOLD ? Date.now() + CIRCUIT_OPEN_MS : 0,
  })
}

function resetCircuit(provider: StreamingProviderName) {
  circuitState.delete(provider)
}

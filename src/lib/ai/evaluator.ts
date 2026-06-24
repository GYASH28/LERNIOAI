/**
 * Rubric-based answer evaluator.
 *
 * Higher-level wrapper around `AiProvider.evaluate()` that:
 *  - Optionally enriches the rubric with retrieved lesson context (so the
 *    evaluator has the same grounding the tutor uses).
 *  - Normalises inputs (clamps marks, strips empty fields).
 *  - Surfaces a clean `EvaluationResult` to API routes.
 *
 * The AI output is ALWAYS clearly labelled "AI estimate" — teacher marks
 * override AI marks in the platform's trust model.
 *
 * Server-only.
 */
import 'server-only'
import { getAiProvider } from '@/lib/ai/provider'
import type {
  EvaluationRequest,
  EvaluationResponse,
} from '@/lib/ai/provider'
import {
  retrieveLessonContext,
  chunksToContextBlock,
} from '@/lib/ai/retrieval'

export interface EvaluateAnswerParams {
  question: string
  subject?: string
  unit?: string
  topic?: string
  maxMarks: number
  /** Optional reference answer from the question bank. */
  modelAnswer?: string
  /** Optional marking-scheme key points. */
  keyPoints?: string[]
  studentAnswer: string
  signal?: AbortSignal
}

export type EvaluationResult = EvaluationResponse

/**
 * Evaluate a student's answer against the question + rubric.
 *
 * On any provider failure, returns a safe `usedFallback: true` result with
 * zero marks — never throws to the caller. The route layer is responsible for
 * surfacing the disclaimer to the student.
 */
export async function evaluateAnswer(
  params: EvaluateAnswerParams,
): Promise<EvaluationResult> {
  const maxMarks = Math.max(0, Math.floor(params.maxMarks || 0))
  if (!maxMarks) {
    return {
      estimatedMarks: 0,
      criterionScores: {
        correctness: 0,
        completeness: 0,
        structure: 0,
        clarity: 0,
      },
      correctPoints: [],
      missingPoints: ['Question has no marks allocated — cannot evaluate.'],
      incorrectClaims: [],
      structureFeedback: 'Invalid rubric.',
      suggestedImprovedAnswer: '',
      confidence: 0,
      estimateLabel: 'AI estimate',
      usedFallback: true,
    }
  }

  // Optionally retrieve real lesson context to ground the rubric.
  let groundingContext = ''
  if (params.subject || params.unit || params.topic) {
    try {
      const chunks = await retrieveLessonContext({
        subjectName: params.subject,
        unitTitle: params.unit,
        topicTitle: params.topic,
        maxLessons: 3,
        maxChunks: 6,
      })
      groundingContext = chunksToContextBlock(chunks)
    } catch (err) {
      // Non-fatal — evaluator still works without grounding context.
      console.error('[ai:evaluator] retrieval failed:', safeErr(err))
    }
  }

  const request: EvaluationRequest = {
    question: params.question,
    subject: params.subject,
    unit: params.unit,
    topic: params.topic,
    maxMarks,
    modelAnswer: params.modelAnswer?.trim() || undefined,
    keyPoints: params.keyPoints?.filter((k) => k.trim()) || undefined,
    studentAnswer: params.studentAnswer,
    signal: params.signal,
  }

  // Fold the grounding context into the question prompt the provider builds.
  // We do this by appending it to the model answer field if no explicit model
  // answer exists, OR by extending the question. Cleanest: pass as part of the
  // question so the provider's prompt builder includes it verbatim.
  if (groundingContext) {
    request.question = `${params.question}\n\n--- GROUNDING CONTEXT (use to judge correctness) ---\n${groundingContext}`
  }

  const provider = getAiProvider()
  return provider.evaluate(request)
}

// ----------------------------------------------------------
// Helpers
// ----------------------------------------------------------

function safeErr(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message.slice(0, 200)}`
  return String(err).slice(0, 200)
}

/**
 * Exams answer evaluator endpoint.
 *
 * POST /api/exams/evaluate
 * Body: { questionId, studentAnswer, maxMarks }
 *
 * Loads the question server-side (never trusts a client-supplied question
 * text), pulls the question's marks + model answer + tags as rubric context,
 * then calls `evaluateAnswer()` to get a structured rubric-based evaluation.
 *
 * Trust model:
 *  - `requireUser()` enforces auth.
 *  - The question text + marks are loaded from the DB — client cannot spoof.
 *  - If the DB question has marks > 0, those are authoritative (audit P0.4).
 *  - AI marks are always labelled "AI estimate" — teacher marks override.
 *
 * Returns: { ok, data: EvaluationResult }
 */
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser, withApi, okResponse, ApiError } from '@/lib/auth'
import { parseBody } from '@/lib/schemas'
import { evaluateAnswer } from '@/lib/ai/evaluator'

const evaluateAnswerSchema = z.object({
  questionId: z.string().min(1),
  studentAnswer: z.string().min(1).max(20000),
  maxMarks: z.number().int().min(0).max(100).optional(),
})

export const POST = (req: NextRequest) =>
  withApi(async () => {
    const user = await requireUser()
    const body = await parseBody(req, evaluateAnswerSchema)

    // Load the question server-side with full context (subject/unit/topic).
    const question = await db.question.findUnique({
      where: { id: body.questionId },
      include: {
        topic: { include: { unit: { include: { subject: true } } } },
        subject: true,
      },
    })
    if (!question) {
      throw new ApiError('NOT_FOUND', 'Question not found.', 404, false)
    }

    // Server-authoritative marks: prefer DB, fall back to client-supplied.
    const maxMarks =
      question.marks && question.marks > 0
        ? question.marks
        : body.maxMarks ?? 0

    if (!maxMarks) {
      throw new ApiError(
        'BAD_RUBRIC',
        'This question has no marks allocated and no maxMarks was provided.',
        400,
        false,
      )
    }

    // Pull rubric enrichment from the question record.
    const subjectName = question.subject?.name
    const unitTitle = question.topic?.unit?.title
    const topicTitle = question.topic?.title
    const modelAnswer =
      question.explanation?.trim() || question.correctAnswer?.trim() || undefined
    const keyPoints = parseKeyPoints(question.tags)

    const result = await evaluateAnswer({
      question: question.question,
      subject: subjectName,
      unit: unitTitle,
      topic: topicTitle,
      maxMarks,
      modelAnswer,
      keyPoints,
      studentAnswer: body.studentAnswer,
    })

    // Optionally record a lightweight attempt for analytics. We deliberately do
    // NOT write `isCorrect` here — the evaluator returns a continuous mark, not
    // a boolean, and the student's intent here is evaluation, not scoring.
    try {
      await db.questionAttempt.create({
        data: {
          userId: user.id,
          questionId: question.id,
          userAnswer: body.studentAnswer,
          isCorrect: null, // unknown — AI estimate only
          context: 'diagnostic',
          confidence: result.confidence,
        },
      })
    } catch (err) {
      // Non-fatal — evaluation result still returned.
      console.error('[exams/evaluate] attempt log failed:', safeErr(err))
    }

    return okResponse(result)
  })

// ----------------------------------------------------------
// Helpers
// ----------------------------------------------------------

/** Parse a Question.tags JSON string (array of strings) into key points. */
function parseKeyPoints(tagsJson: string | null | undefined): string[] | undefined {
  if (!tagsJson) return undefined
  try {
    const parsed = JSON.parse(tagsJson)
    if (Array.isArray(parsed)) {
      const pts = parsed
        .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        .map((x) => x.trim())
      return pts.length ? pts : undefined
    }
  } catch {
    // not JSON — treat as a single key point if non-empty
    if (tagsJson.trim()) return [tagsJson.trim()]
  }
  return undefined
}

function safeErr(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message.slice(0, 200)}`
  return String(err).slice(0, 200)
}

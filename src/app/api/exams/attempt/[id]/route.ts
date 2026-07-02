import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, withApi, okResponse, ApiError } from '@/lib/auth'
import { parseBody, autosaveAttemptSchema } from '@/lib/schemas'
import type { ExamQuestionDTO, ReviewQuestionDTO } from '@/lib/questions'
import {
  getStudentLearningScope,
  isSubjectIdInLearningScope,
} from '@/features/learning/server/get-student-learning-scope'

/**
 * GET /api/exams/attempt/[id]
 *
 * Resume an in-progress attempt OR fetch the scored review for a submitted
 * attempt. Ownership is enforced (userId match).
 *
 * - in_progress: returns the safe ExamQuestionDTOs (from questionsJson) +
 *   current autosaved answers + remaining time.
 * - submitted/locked: returns the scored review payload (correct answers via
 *   toReviewDTO) + final score. Used to revisit a completed exam.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  return withApi(async () => {
    const user = await requireUser()
    const { id } = await ctx.params

    const attempt = await db.quizAttempt.findFirst({
      where: { id, userId: user.id },
    })
    if (!attempt) {
      throw new ApiError('NOT_FOUND', 'Attempt not found.', 404, false)
    }
    await assertAttemptInLearningScope(user.id, attempt.subjectId)

    // ------------------------------------------------------------------
    // In-progress: hydrate from questionsJson + answersJson.
    // ------------------------------------------------------------------
    if (attempt.status === 'in_progress') {
      if (!attempt.questionsJson) {
        throw new ApiError(
          'INTERNAL_ERROR',
          'Attempt is missing its question set.',
          500,
          true,
        )
      }
      const qblob = JSON.parse(attempt.questionsJson) as {
        questions: ExamQuestionDTO[]
        questionIds: string[]
        durationMins: number
      }
      const ablob = attempt.answersJson
        ? (JSON.parse(attempt.answersJson) as {
            answers?: Record<string, string>
            flagged?: string[]
            timeLeftSec?: number
            currentIdx?: number
          })
        : {}

      return okResponse({
        status: attempt.status,
        attemptId: attempt.id,
        questions: qblob.questions,
        questionIds: qblob.questionIds,
        durationMins: qblob.durationMins,
        startedAt: attempt.startedAt,
        answers: ablob.answers ?? {},
        flagged: ablob.flagged ?? [],
        timeLeftSec: ablob.timeLeftSec ?? qblob.durationMins * 60,
        currentIdx: ablob.currentIdx ?? 0,
        subjectId: attempt.subjectId,
        mode: attempt.mode,
      })
    }

    // ------------------------------------------------------------------
    // Submitted/locked: return the scored review payload.
    // The review payload is stored in answersJson at submit time; we also
    // hydrate the safe question DTOs + their correct answers via toReviewDTO
    // so the client can render the answer-review screen without another call.
    // ------------------------------------------------------------------
    const reviewBlob = attempt.answersJson
      ? (JSON.parse(attempt.answersJson) as Array<{
          questionId: string
          question: string
          type: string
          options: string[] | null
          answer: string | null
          isCorrect: boolean
          marks: number
          negativeMark: number
          correctAnswer: string | null
          explanation: string | null
          hint: string | null
          flagged?: boolean
        }>)
      : []

    // Hydrate the per-question review metadata (correctAnswer / explanation /
    // hint) directly from the stored review items so we don't have to re-fetch
    // the full Question rows for a locked attempt.
    const reviewDTOs: Array<ReviewQuestionDTO & {
      answer: string | null
      isCorrect: boolean
      marks: number
      negativeMark: number
      flagged?: boolean
    }> = reviewBlob.map((r) => ({
      id: r.questionId,
      type: r.type,
      difficulty: '', // not stored in the review blob; not needed for review screen
      question: r.question,
      options: r.options,
      marks: r.marks,
      topicId: null,
      subjectId: attempt.subjectId ?? '',
      unitNumber: null,
      correctAnswer: r.correctAnswer,
      explanation: r.explanation,
      hint: r.hint,
      answer: r.answer,
      isCorrect: r.isCorrect,
      negativeMark: r.negativeMark,
      flagged: r.flagged,
    }))

    return okResponse({
      status: attempt.status,
      attemptId: attempt.id,
      subjectId: attempt.subjectId,
      mode: attempt.mode,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
      totalQuestions: attempt.totalQuestions,
      correctCount: attempt.correctCount,
      score: attempt.score,
      maxScore: attempt.maxScore,
      durationMs: attempt.durationMs,
      negativeMarks: attempt.negativeMarks,
      review: reviewDTOs,
    })
  })
}

/**
 * PATCH /api/exams/attempt/[id]
 *
 * Autosave in-progress answers. The server stores the autosave blob in
 * answersJson so a resumed attempt (GET) can rehydrate the exact state.
 *
 * 409 Conflict if the attempt is no longer in_progress (already submitted
 * or locked) — prevents a stale client from clobbering a scored attempt.
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  return withApi(async () => {
    const user = await requireUser()
    const { id } = await ctx.params
    const body = await parseBody(req, autosaveAttemptSchema)

    const attempt = await db.quizAttempt.findFirst({
      where: { id, userId: user.id },
      select: { id: true, status: true, questionsJson: true, subjectId: true },
    })
    if (!attempt) {
      throw new ApiError('NOT_FOUND', 'Attempt not found.', 404, false)
    }
    await assertAttemptInLearningScope(user.id, attempt.subjectId)
    if (attempt.status !== 'in_progress') {
      throw new ApiError(
        'CONFLICT',
        'Attempt is not in progress.',
        409,
        false,
      )
    }

    // Keep durationMins so we can cap timeLeftSec on the client side.
    const qblob = attempt.questionsJson
      ? (JSON.parse(attempt.questionsJson) as { durationMins?: number })
      : {}
    const durationMins = qblob.durationMins ?? 0

    await db.quizAttempt.update({
      where: { id },
      data: {
        answersJson: JSON.stringify({
          answers: body.answers,
          flagged: body.flagged ?? [],
          timeLeftSec: body.timeLeftSec ?? durationMins * 60,
          currentIdx: body.currentIdx ?? 0,
        }),
      },
    })

    return okResponse({ saved: true })
  })
}

async function assertAttemptInLearningScope(userId: string, subjectId: string | null) {
  if (!subjectId) return
  const scope = await getStudentLearningScope(userId)
  if (!scope || !isSubjectIdInLearningScope(scope, subjectId)) {
    throw new ApiError('NOT_FOUND', 'Attempt not found.', 404, false)
  }
}

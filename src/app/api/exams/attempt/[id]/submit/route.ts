import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, withApi, okResponse, ApiError } from '@/lib/auth'
import { parseBody, submitAttemptSchema } from '@/lib/schemas'
import { evaluateAnswer, toReviewDTO, type ExamQuestionDTO } from '@/lib/questions'
import { awardXp } from '@/lib/xp'
import { evaluateAchievements, type UnlockedAchievement } from '@/lib/achievements'
import {
  getStudentLearningScope,
  isSubjectIdInLearningScope,
  scopedQuestionWhere,
} from '@/features/learning/server/get-student-learning-scope'
import {
  getLessonEventContext,
  getSubjectEventContext,
  learningSourceRoute,
  recordLearningEvents,
} from '@/lib/learning-events'

/**
 * POST /api/exams/attempt/[id]/submit
 *
 * Lock + score an in-progress attempt. The flow:
 *   1. Load the attempt (must belong to the caller + still be in_progress).
 *   2. Inside a TRANSACTION, re-score every answer server-side against the
 *      stored question set (we re-fetch the full Question rows by the stored
 *      questionIds — never trust the client's view of the questions).
 *   3. Persist the scored review payload to answersJson, set score /
 *      correctCount / maxScore / completedAt / durationMs, and flip status
 *      to 'locked' so the attempt can never be re-submitted or autosaved.
 *   4. Award idempotent XP via the ledger (key `quiz_submit:${attempt.id}`)
 *      and run achievement evaluation.
 *
 * Returns the full scored review payload so the client can render the
 * answer-review screen without another round-trip.
 */

interface StoredQuestionSet {
  questions: ExamQuestionDTO[]
  questionIds: string[]
  durationMins: number
  paperId: string | null
  paperTitle: string | null
  lessonScope?: {
    lessonId?: string | null
    unitNumber?: number | null
  } | null
}

interface ScoredReviewItem {
  questionId: string
  question: string
  type: string
  difficulty: string
  options: string[] | null
  answer: string | null
  isCorrect: boolean
  marks: number
  negativeMark: number
  correctAnswer: string | null
  explanation: string | null
  hint: string | null
  flagged: boolean
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  return withApi(async () => {
    const user = await requireUser()
    const { id } = await ctx.params
    const body = await parseBody(req, submitAttemptSchema)

    // 1. Load + guard the attempt.
    const attempt = await db.quizAttempt.findFirst({
      where: { id, userId: user.id },
    })
    if (!attempt) {
      throw new ApiError('NOT_FOUND', 'Attempt not found.', 404, false)
    }
    if (attempt.status !== 'in_progress') {
      throw new ApiError(
        'CONFLICT',
        'This exam has already been submitted.',
        409,
        false,
      )
    }
    if (!attempt.questionsJson) {
      throw new ApiError(
        'INTERNAL_ERROR',
        'Attempt is missing its question set.',
        500,
        true,
      )
    }
    const scope = await getStudentLearningScope(user.id)
    if (!scope || (attempt.subjectId && !isSubjectIdInLearningScope(scope, attempt.subjectId))) {
      throw new ApiError('NOT_FOUND', 'Attempt not found.', 404, false)
    }

    const qblob = JSON.parse(attempt.questionsJson) as StoredQuestionSet
    const questionIds = qblob.questionIds

    // 2. Re-fetch the full Question rows by the stored IDs — never trust
    //    the client's view of the questions or its score.
    const questions = await db.question.findMany({
      where: { ...scopedQuestionWhere(scope), id: { in: questionIds } },
    })
    if (questions.length !== questionIds.length) {
      throw new ApiError('NOT_FOUND', 'Attempt not found.', 404, false)
    }
    const questionMap = new Map(questions.map((q) => [q.id, q]))

    // Preserve original question order (matches the order the student saw).
    const orderedQuestions = questionIds
      .map((qid) => questionMap.get(qid))
      .filter((q): q is NonNullable<typeof q> => q !== undefined)

    const flaggedSet = new Set(body.flagged ?? [])

    // ----------------------------------------------------------------
    // 3. Score + persist inside a single transaction. The transaction
    //    guarantees the status flip + the score write happen atomically
    //    (no half-locked attempts if XP award throws after scoring).
    // ----------------------------------------------------------------
    const reviewItems: ScoredReviewItem[] = []
    let correctCount = 0
    let earnedMarks = 0
    let lostMarks = 0
    let maxScore = 0

    for (const q of orderedQuestions) {
      maxScore += q.marks
      const rawAnswer = body.answers[q.id] ?? null
      const answer = rawAnswer && rawAnswer.length > 0 ? rawAnswer : null
      const { isCorrect } = evaluateAnswer(q, answer)

      let marksAwarded = 0
      if (isCorrect) {
        correctCount += 1
        marksAwarded = q.marks
        earnedMarks += q.marks
      } else if (answer !== null) {
        // Only deduct negative marks when an actual wrong answer was given.
        marksAwarded = -q.negativeMark
        lostMarks += q.negativeMark
      }

      // toReviewDTO gives us correctAnswer / explanation / hint.
      const reviewDTO = toReviewDTO(q)
      reviewItems.push({
        questionId: q.id,
        question: reviewDTO.question,
        type: reviewDTO.type,
        difficulty: reviewDTO.difficulty,
        options: reviewDTO.options,
        answer,
        isCorrect,
        marks: marksAwarded,
        negativeMark: q.negativeMark,
        correctAnswer: reviewDTO.correctAnswer,
        explanation: reviewDTO.explanation,
        hint: reviewDTO.hint,
        flagged: flaggedSet.has(q.id),
      })
    }

    const finalScore = Math.max(0, earnedMarks - lostMarks)
    const negativeMarks = lostMarks
    const totalQuestions = orderedQuestions.length
    const durationMs = body.durationMs ?? 0
    const priorAttemptCounts = await db.questionAttempt.groupBy({
      by: ['questionId'],
      where: { userId: user.id, questionId: { in: questionIds } },
      _count: { _all: true },
    })
    const attemptNumberByQuestion = new Map(
      priorAttemptCounts.map((item) => [item.questionId, item._count._all + 1]),
    )

    // Atomic: flip status -> 'locked' + persist scored review payload +
    // score/correctCount/etc. We go straight to 'locked' (skipping the
    // intermediate 'submitted') because the entire scoring+XP write happens
    // inside this transaction — by the time it commits, the attempt is
    // fully scored and immutable.
    await db.$transaction(async (tx) => {
      await tx.quizAttempt.update({
        where: { id: attempt.id },
        data: {
          status: 'locked',
          completedAt: new Date(),
          score: finalScore,
          maxScore,
          correctCount,
          totalQuestions,
          negativeMarks,
          durationMs,
          answersJson: JSON.stringify(reviewItems),
        },
      })
      await tx.questionAttempt.createMany({
        data: reviewItems.map((item) => ({
          userId: user.id,
          questionId: item.questionId,
          lessonId: attempt.lessonId,
          userAnswer: item.answer,
          isCorrect: item.isCorrect,
          timeTakenMs: 0,
          hintUsed: false,
          confidence: 0,
          attemptNumber: attemptNumberByQuestion.get(item.questionId) ?? 1,
          context: attempt.mode,
        })),
      })
    })

    const sourceRoute = learningSourceRoute(req, attempt.mode === 'mock_exam' ? '/exams' : '/practice')
    const eventContext = attempt.lessonId
      ? await getLessonEventContext(attempt.lessonId)
      : attempt.subjectId
        ? await getSubjectEventContext(attempt.subjectId, qblob.lessonScope?.unitNumber)
        : {}
    await recordLearningEvents([
      ...reviewItems
        .filter((item) => item.answer !== null)
        .flatMap((item) => {
          const question = questionMap.get(item.questionId)
          const questionContext = {
            ...eventContext,
            subjectId: question?.subjectId ?? eventContext.subjectId,
            unitNumber: question?.unitNumber ?? eventContext.unitNumber,
            lessonId: attempt.lessonId,
          }
          const answered = {
            userId: user.id,
            type: 'quiz_answered' as const,
            idempotencyKey: `quiz_answered:${attempt.id}:${item.questionId}`,
            sourceRoute,
            ...questionContext,
            payload: {
              attemptId: attempt.id,
              questionId: item.questionId,
              selectedAnswer: item.answer,
              correct: item.isCorrect,
            },
          }
          if (item.isCorrect) return [answered]
          return [
            answered,
            {
              userId: user.id,
              type: 'question_incorrect' as const,
              idempotencyKey: `question_incorrect:${attempt.id}:${item.questionId}`,
              sourceRoute,
              ...questionContext,
              payload: {
                attemptId: attempt.id,
                questionId: item.questionId,
                selectedAnswer: item.answer,
                correctAnswer: item.correctAnswer,
                explanation: item.explanation,
                topicId: question?.topicId ?? null,
              },
            },
          ]
        }),
      {
        userId: user.id,
        type: 'quiz_completed',
        idempotencyKey: `quiz_completed:${attempt.id}`,
        sourceRoute,
        ...eventContext,
        payload: {
          attemptId: attempt.id,
          mode: attempt.mode,
          score: finalScore,
          maxScore,
          correctCount,
          totalQuestions,
          durationMs,
        },
      },
    ])

    // ----------------------------------------------------------------
    // 4. Idempotent XP award + achievement evaluation (outside the
    //    scoring transaction so a ledger race doesn't roll back the score).
    // ----------------------------------------------------------------
    const baseXp =
      attempt.mode === 'mock_exam' ? 50 : attempt.mode === 'chapter_test' ? 25 : 10
    const scoreXp = Math.round(finalScore)
    const xp = await awardXp({
      userId: user.id,
      eventType: 'quiz_submit',
      amount: baseXp + scoreXp,
      idempotencyKey: `quiz_submit:${attempt.id}`,
      sourceId: attempt.id,
    })

    let newlyUnlocked: UnlockedAchievement[] = []
    try {
      newlyUnlocked = await evaluateAchievements({
        userId: user.id,
        trigger: 'quiz_submit',
      })
    } catch {
      // Achievement evaluation must never break the submit flow.
      newlyUnlocked = []
    }

    // Re-read authoritative XP total after achievement awards.
    const finalUser = await db.user.findUnique({
      where: { id: user.id },
      select: { xp: true },
    })

    return okResponse({
      attemptId: attempt.id,
      status: 'locked',
      review: reviewItems,
      score: finalScore,
      maxScore,
      correctCount,
      totalQuestions,
      negativeMarks,
      durationMs,
      xpAwarded: xp.awarded ? xp.amount : 0,
      xpAlreadyAwarded: !xp.awarded,
      totalXp: finalUser?.xp ?? 0,
      newlyUnlocked,
    })
  })
}

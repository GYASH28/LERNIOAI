import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, withApi, okResponse, ApiError } from '@/lib/auth'
import { parseBody, questionAttemptSchema } from '@/lib/schemas'
import { evaluateAnswer } from '@/lib/questions'
import { awardXp } from '@/lib/xp'
import { evaluateAchievements } from '@/lib/achievements'
import { DEMO_PROGRESS, isDemoMode } from '@/lib/demo-fixtures'
import {
  getStudentLearningScope,
  isSubjectIdInLearningScope,
  isTopicIdInLearningScope,
  scopedLessonWhere,
  scopedQuestionWhere,
  subjectIdsForLearningScope,
  topicIdsForLearningScope,
} from '@/features/learning/server/get-student-learning-scope'

/**
 * GET /api/progress
 * Returns the current user's progress (mastery, lesson completions, attempts, sessions).
 *
 * Query: ?type=all|mastery|lessons|attempts|sessions
 */
export async function GET(req: NextRequest) {
  return withApi(async () => {
    const sp = req.nextUrl.searchParams
    const type = sp.get('type') || 'all'
    if (isDemoMode()) {
      if (type === 'mastery') return okResponse(DEMO_PROGRESS.mastery)
      if (type === 'lessons') return okResponse(DEMO_PROGRESS.lessonCompletions)
      if (type === 'attempts') {
        return okResponse({
          questionAttempts: DEMO_PROGRESS.questionAttempts,
          quizAttempts: DEMO_PROGRESS.quizAttempts,
        })
      }
      if (type === 'sessions') return okResponse(DEMO_PROGRESS.studySessions)
      return okResponse(DEMO_PROGRESS)
    }

    const user = await requireUser()
    const scope = await getStudentLearningScope(user.id)
    const scopedSubjectIds = subjectIdsForLearningScope(scope)
    const scopedTopicIds = topicIdsForLearningScope(scope)
    if (!scope || scopedSubjectIds.length === 0) {
      if (type === 'mastery') return okResponse([])
      if (type === 'lessons') return okResponse([])
      if (type === 'attempts') return okResponse({ questionAttempts: [], quizAttempts: [] })
      if (type === 'sessions') return okResponse([])
      return okResponse({ mastery: [], lessonCompletions: [], questionAttempts: [], quizAttempts: [], studySessions: [] })
    }

    const [mastery, lessonCompletions, questionAttempts, quizAttempts, studySessions] =
      await Promise.all([
        db.userTopicMastery.findMany({
          where: { userId: user.id, topicId: { in: scopedTopicIds } },
          include: { topic: { include: { unit: { include: { subject: true } } } } },
        }),
        db.lessonCompletion.findMany({
          where: { userId: user.id, lesson: scopedLessonWhere(scope) },
          include: { lesson: true },
        }),
        db.questionAttempt.findMany({
          where: { userId: user.id, question: { subjectId: { in: scopedSubjectIds } } },
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
        db.quizAttempt.findMany({
          where: { userId: user.id, subjectId: { in: scopedSubjectIds } },
          orderBy: { startedAt: 'desc' },
          take: 20,
        }),
        db.studySession.findMany({
          where: {
            userId: user.id,
            OR: [{ subjectId: null }, { subjectId: { in: scopedSubjectIds } }],
          },
          orderBy: { startedAt: 'desc' },
          take: 30,
        }),
      ])

    if (type === 'mastery') return okResponse(mastery)
    if (type === 'lessons') return okResponse(lessonCompletions)
    if (type === 'attempts') return okResponse({ questionAttempts, quizAttempts })
    if (type === 'sessions') return okResponse(studySessions)

    return okResponse({ mastery, lessonCompletions, questionAttempts, quizAttempts, studySessions })
  })
}

/**
 * POST /api/progress
 * Records a single-question practice attempt.
 *
 * CRITICAL SECURITY:
 *   - The browser submits ONLY the answer (`userAnswer`).
 *   - The server fetches the Question row, evaluates correctness via `evaluateAnswer()`,
 *     and IGNORES any client-supplied `isCorrect`.
 *   - XP is awarded via the idempotent ledger.
 *   - Mastery/revision schedule updated server-side.
 *   - Achievement evaluation runs AFTER the verified write.
 */
export async function POST(req: NextRequest) {
  return withApi(async () => {
    const user = await requireUser()
    const body = await parseBody(req, questionAttemptSchema)
    const scope = await getStudentLearningScope(user.id)
    if (!scope || subjectIdsForLearningScope(scope).length === 0) {
      throw new ApiError('NOT_FOUND', 'Question not found.', 404, false)
    }

    // Fetch the question — needed for server-side correctness evaluation.
    const question = await db.question.findFirst({
      where: { id: body.questionId, ...scopedQuestionWhere(scope) },
    })
    if (!question) {
      throw new ApiError('NOT_FOUND', 'Question not found.', 404, false)
    }

    if (!scope || !isSubjectIdInLearningScope(scope, question.subjectId)) {
      throw new ApiError('NOT_FOUND', 'Question not found.', 404, false)
    }
    if (body.topicId && body.topicId !== question.topicId) {
      throw new ApiError('BAD_REQUEST', 'topicId must match the submitted question.', 400, false)
    }
    if (question.topicId && !isTopicIdInLearningScope(scope, question.topicId)) {
      throw new ApiError('NOT_FOUND', 'Question not found.', 404, false)
    }
    const lesson = body.lessonId
      ? await findPracticeLessonForQuestion(scope, body.lessonId, {
          subjectId: question.subjectId,
          topicId: question.topicId,
          unitNumber: question.unitNumber,
        })
      : null
    if (body.lessonId && !lesson) {
      throw new ApiError('NOT_FOUND', 'Lesson not found.', 404, false)
    }

    // SERVER-SIDE correctness evaluation. Never trust the client.
    const { isCorrect } = evaluateAnswer(question, body.userAnswer ?? null)

    // Compute next attempt number for this user+question.
    const priorCount = await db.questionAttempt.count({
      where: { userId: user.id, questionId: question.id },
    })

    const attempt = await db.questionAttempt.create({
      data: {
        userId: user.id,
        questionId: question.id,
        userAnswer: body.userAnswer,
        isCorrect,
        timeTakenMs: body.timeTakenMs ?? 0,
        hintUsed: body.hintUsed ?? false,
        confidence: body.confidence ?? 0,
        attemptNumber: priorCount + 1,
        context: body.context ?? 'practice',
        lessonId: lesson?.id,
      },
    })

    // Update topic mastery if topicId provided (or derive from question).
    const topicId = question.topicId
    if (topicId) {
      const existing = await db.userTopicMastery.findUnique({
        where: { userId_topicId: { userId: user.id, topicId } },
      })
      const newEvidence = (existing?.evidenceCount ?? 0) + 1
      const correctnessRate = existing
        ? (existing.score * existing.evidenceCount + (isCorrect ? 100 : 0)) / newEvidence
        : isCorrect
          ? 100
          : 0
      const newState =
        correctnessRate >= 85
          ? 'mastered'
          : correctnessRate >= 65
            ? 'proficient'
            : correctnessRate >= 40
              ? 'learning'
              : 'weak'
      const nextRevision = new Date()
      nextRevision.setDate(
        nextRevision.getDate() +
          (newState === 'mastered' ? 7 : newState === 'proficient' ? 3 : 1),
      )

      await db.userTopicMastery.upsert({
        where: { userId_topicId: { userId: user.id, topicId } },
        update: {
          score: correctnessRate,
          state: newState,
          evidenceCount: newEvidence,
          lastPractised: new Date(),
          nextRevision,
          confidence:
            (existing?.confidence ?? 0) * 0.7 + (body.confidence ?? 0.5) * 0.3,
        },
        create: {
          userId: user.id,
          topicId,
          score: correctnessRate,
          state: newState,
          evidenceCount: 1,
          confidence: body.confidence ?? 0.5,
          lastPractised: new Date(),
          nextRevision,
        },
      })

      await db.revisionSchedule.upsert({
        where: { userId_topicId: { userId: user.id, topicId } },
        update: {
          nextDueDate: nextRevision,
          state: newState,
          easeFactor: newState === 'mastered' ? 2.8 : 2.3,
        },
        create: {
          userId: user.id,
          topicId,
          nextDueDate: nextRevision,
          state: newState,
          intervalDays: 1,
          easeFactor: 2.5,
        },
      })
    }

    // Award XP via the idempotent ledger.
    const xpAmount = isCorrect ? 10 : 2
    const xp = await awardXp({
      userId: user.id,
      eventType: isCorrect ? 'question_correct' : 'question_attempt',
      amount: xpAmount,
      idempotencyKey: `question_attempt:${attempt.id}`,
      sourceId: attempt.id,
    })

    // Trigger achievement evaluation after the verified write.
    try {
      await evaluateAchievements({
        userId: user.id,
        trigger: 'question_correct',
      })
    } catch {
      // Achievement eval must never break the user-facing flow.
    }

    // Re-read the authoritative total AFTER any achievement XP awards.
    const finalUser = await db.user.findUnique({
      where: { id: user.id },
      select: { xp: true },
    })

    return okResponse({
      attempt,
      isCorrect,
      xpGain: xp.awarded ? xp.amount : 0,
      totalXp: finalUser?.xp ?? 0,
      // The question's answer-side fields are now safe to surface because the
      // attempt is already recorded — the client needs them to render feedback
      // without an extra round-trip (and /api/questions no longer returns them).
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      hint: question.hint,
      options: question.options,
      questionType: question.type,
    })
  })
}

async function findPracticeLessonForQuestion(
  scope: NonNullable<Awaited<ReturnType<typeof getStudentLearningScope>>>,
  lessonId: string,
  question: { subjectId: string; topicId: string | null; unitNumber: number | null },
) {
  const lesson = await db.lesson.findFirst({
    where: { id: lessonId, ...scopedLessonWhere(scope) },
    select: {
      id: true,
      unit: {
        select: {
          number: true,
          subjectId: true,
        },
      },
      topic: {
        select: {
          id: true,
          unit: {
            select: {
              number: true,
              subjectId: true,
            },
          },
        },
      },
    },
  })
  if (!lesson) return null

  const lessonSubjectId = lesson.topic?.unit.subjectId ?? lesson.unit?.subjectId ?? null
  const lessonUnitNumber = lesson.topic?.unit.number ?? lesson.unit?.number ?? null
  if (lessonSubjectId !== question.subjectId) return null
  if (question.topicId && lesson.topic?.id === question.topicId) return { id: lesson.id }
  if (question.unitNumber && lessonUnitNumber === question.unitNumber) return { id: lesson.id }
  if (!question.topicId && !question.unitNumber) return { id: lesson.id }
  return null
}

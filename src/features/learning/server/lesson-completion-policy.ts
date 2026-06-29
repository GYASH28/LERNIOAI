import 'server-only'

import { db } from '@/lib/db'

export interface LessonCompletionCriteriaInput {
  minimumVideoPercent: number
  requirePractice: boolean
  requireQuizPass: boolean
  minimumQuizScore?: number | null
  requireExplicitDone: boolean
}

export interface LessonCompletionEvidence {
  explicitDone: boolean
  maxVideoPercent: number
  hasPracticeAttempt: boolean
  hasQuizPass: boolean
}

export interface LessonCompletionPolicyResult {
  canComplete: boolean
  blockers: string[]
}

interface StoredLessonQuizQuestionSet {
  questionIds?: unknown
  lessonScope?: {
    lessonId?: unknown
    subjectId?: unknown
    topicId?: unknown
    unitNumber?: unknown
    selection?: unknown
  } | null
}

export function evaluateLessonCompletionCriteria(
  criteria: LessonCompletionCriteriaInput | null,
  evidence: LessonCompletionEvidence,
): LessonCompletionPolicyResult {
  if (!criteria) return { canComplete: true, blockers: [] }

  const blockers: string[] = []
  if (criteria.requireExplicitDone && !evidence.explicitDone) {
    blockers.push('Explicit completion confirmation is required.')
  }
  if (criteria.minimumVideoPercent > 0 && evidence.maxVideoPercent < criteria.minimumVideoPercent) {
    blockers.push(`Watch at least ${criteria.minimumVideoPercent}% of the approved lesson video.`)
  }
  if (criteria.requirePractice && !evidence.hasPracticeAttempt) {
    blockers.push('Complete the required lesson practice evidence.')
  }
  if (criteria.requireQuizPass && !evidence.hasQuizPass) {
    blockers.push('Pass the required lesson quiz.')
  }

  return { canComplete: blockers.length === 0, blockers }
}

export async function getLessonCompletionPolicyState(
  userId: string,
  lessonId: string,
  explicitDone: boolean,
): Promise<LessonCompletionPolicyResult> {
  const criteria = await db.lessonCompletionCriteria.findFirst({
    where: { lessonId, status: 'active' },
    select: {
      minimumVideoPercent: true,
      requirePractice: true,
      requireQuizPass: true,
      minimumQuizScore: true,
      requireExplicitDone: true,
    },
  })
  if (!criteria) return { canComplete: true, blockers: [] }

  const video = await db.videoWatchProgress.aggregate({
    where: { userId, lessonId },
    _max: { watchPercent: true },
  })
  const practiceAttemptCount = await db.questionAttempt.count({
    where: { userId, lessonId },
  })
  const quizPassAttempts = criteria.requireQuizPass
    ? await db.quizAttempt.findMany({
        where: {
          userId,
          lessonId,
          status: { in: ['submitted', 'locked'] },
          completedAt: { not: null },
          score: { gte: criteria.minimumQuizScore ?? 0 },
        },
        select: { questionsJson: true },
      })
    : []

  return evaluateLessonCompletionCriteria(criteria, {
    explicitDone,
    maxVideoPercent: video._max.watchPercent ?? 0,
    hasPracticeAttempt: practiceAttemptCount > 0,
    hasQuizPass: quizPassAttempts.some((attempt) =>
      quizAttemptHasMatchingLessonScope(attempt.questionsJson, lessonId),
    ),
  })
}

export function quizAttemptHasMatchingLessonScope(
  questionsJson: string | null | undefined,
  lessonId: string,
): boolean {
  if (!questionsJson) return false

  let parsed: StoredLessonQuizQuestionSet
  try {
    parsed = JSON.parse(questionsJson) as StoredLessonQuizQuestionSet
  } catch {
    return false
  }

  const lessonScope = parsed.lessonScope
  const questionIds = parsed.questionIds
  return (
    lessonScope?.lessonId === lessonId &&
    Array.isArray(questionIds) &&
    questionIds.length > 0 &&
    (lessonScope.selection === 'topic' || lessonScope.selection === 'unit')
  )
}

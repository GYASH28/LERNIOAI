import type { Prisma } from '@prisma/client'

export const STUDENT_VISIBLE_CODING_CHALLENGE_STATUSES = ['published', 'active'] as const

export interface CodingChallengeScopeInput {
  subjectIds: string[]
  unitIds: string[]
  topicIds: string[]
  lessonIds: string[]
  canPreviewDrafts?: boolean
}

export interface CodingChallengeContext {
  subjectId: string | null
  unitId: string | null
  topicId: string | null
  lessonId: string | null
}

export interface CodingChallengeContextSource {
  subjectId?: string | null
  unitId?: string | null
  topicId?: string | null
  lessonId?: string | null
  unit?: { id?: string | null; subjectId?: string | null } | null
  topic?: {
    id?: string | null
    unitId?: string | null
    unit?: { id?: string | null; subjectId?: string | null } | null
  } | null
  lesson?: {
    id?: string | null
    unitId?: string | null
    topicId?: string | null
    unit?: { id?: string | null; subjectId?: string | null } | null
    topic?: {
      id?: string | null
      unitId?: string | null
      unit?: { id?: string | null; subjectId?: string | null } | null
    } | null
  } | null
}

export function codingChallengeWhereForLearningScope(
  input: CodingChallengeScopeInput,
): Prisma.CodingChallengeWhereInput {
  const subjectIds = unique(input.subjectIds)
  const unitIds = unique(input.unitIds)
  const topicIds = unique(input.topicIds)
  const lessonIds = unique(input.lessonIds)

  const visibleStatus = input.canPreviewDrafts
    ? { not: 'archived' }
    : { in: [...STUDENT_VISIBLE_CODING_CHALLENGE_STATUSES] }

  const scoped: Prisma.CodingChallengeWhereInput[] = [
    { subjectId: null, unitId: null, topicId: null, lessonId: null },
  ]

  if (subjectIds.length > 0) {
    scoped.push(
      { subjectId: { in: subjectIds } },
      { unit: { subjectId: { in: subjectIds } } },
      { topic: { unit: { subjectId: { in: subjectIds } } } },
      { lesson: { unit: { subjectId: { in: subjectIds } } } },
      { lesson: { topic: { unit: { subjectId: { in: subjectIds } } } } },
    )
  }
  if (unitIds.length > 0) scoped.push({ unitId: { in: unitIds } })
  if (topicIds.length > 0) scoped.push({ topicId: { in: topicIds } })
  if (lessonIds.length > 0) scoped.push({ lessonId: { in: lessonIds } })

  return {
    status: visibleStatus,
    OR: scoped,
  }
}

export function codingChallengeContextFromRecord(
  challenge: CodingChallengeContextSource,
): CodingChallengeContext {
  const lessonTopic = challenge.lesson?.topic ?? null
  const topic = challenge.topic ?? lessonTopic
  const unit = challenge.unit ?? topic?.unit ?? challenge.lesson?.unit ?? lessonTopic?.unit ?? null

  return {
    subjectId: challenge.subjectId ?? unit?.subjectId ?? null,
    unitId: challenge.unitId ?? topic?.unitId ?? challenge.lesson?.unitId ?? unit?.id ?? null,
    topicId: challenge.topicId ?? challenge.lesson?.topicId ?? topic?.id ?? null,
    lessonId: challenge.lessonId ?? challenge.lesson?.id ?? null,
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

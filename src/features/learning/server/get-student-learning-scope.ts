import 'server-only'

import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import {
  TARGET_CWIT_DEPARTMENT_CODES,
  TARGET_CWIT_PROGRAMME_CODES,
  isTargetCwitDepartmentCode,
} from '@/lib/cwit-departments'
import {
  PUBLISHED_LESSON_STATUSES,
  STUDENT_RESOURCE_VISIBILITIES,
  studentVisibleQuestionWhere,
  studentVisibleResourceWhere,
  studentVisibleSchemeWhere,
  studentVisibleSubjectWhere,
  studentVisibleTopicWhere,
  studentVisibleUnitWhere,
} from '@/lib/resources/student-publication-policy'
import { lessonRouteSlug } from '../utils/lesson-slugs'

export { PUBLISHED_LESSON_STATUSES, STUDENT_RESOURCE_VISIBILITIES }

export const learningSubjectSelect = {
  id: true,
  code: true,
  name: true,
  shortName: true,
  credits: true,
  category: true,
  icon: true,
  accentColor: true,
  mascotKey: true,
  description: true,
  status: true,
  reviewStatus: true,
  semester: { select: { id: true, number: true, name: true } },
  scheme: { select: { id: true, code: true, name: true, status: true } },
  units: {
    where: studentVisibleUnitWhere(),
    orderBy: { number: 'asc' },
    select: {
      id: true,
      number: true,
      title: true,
      description: true,
      weightage: true,
      topics: {
        where: studentVisibleTopicWhere(),
        orderBy: { title: 'asc' },
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          difficulty: true,
          examWeightage: true,
          lessons: {
            where: { status: { in: [...PUBLISHED_LESSON_STATUSES] }, archivedAt: null },
            orderBy: { order: 'asc' },
            select: {
              id: true,
              title: true,
              order: true,
              durationMin: true,
              topicId: true,
              unitId: true,
            },
          },
        },
      },
      lessons: {
        where: { status: { in: [...PUBLISHED_LESSON_STATUSES] }, archivedAt: null },
        orderBy: { order: 'asc' },
        select: {
          id: true,
          title: true,
          order: true,
          durationMin: true,
          topicId: true,
          unitId: true,
        },
      },
    },
  },
} satisfies Prisma.SubjectSelect

export type LearningSubject = Prisma.SubjectGetPayload<{ select: typeof learningSubjectSelect }>

export interface StudentLearningScope {
  userId: string
  role: string
  institution: { id: string; code: string; name: string } | null
  department: { id: string; code: string; name: string } | null
  programme: { id: string; code: string; name: string } | null
  scheme: { id: string; code: string; name: string; status: string } | null
  semester: { id: string; number: number; name: string } | null
  semesterNumber: number | null
  classGroup: { id: string; code: string | null; name: string; division: string | null } | null
  canPreviewDrafts: boolean
  subjects: LearningSubject[]
  unresolvedReason: string | null
}

export interface ScopedLessonReference {
  id: string
  title: string
  durationMin: number
  subjectId: string
  subjectCode: string
  unitId: string
  unitNumber: number
  topicId: string | null
  canonicalUrl: string
}

export function hasResolvedLearningScope(
  scope: StudentLearningScope | null | undefined,
): scope is StudentLearningScope & {
  institution: NonNullable<StudentLearningScope['institution']>
  department: NonNullable<StudentLearningScope['department']>
  programme: NonNullable<StudentLearningScope['programme']>
  scheme: NonNullable<StudentLearningScope['scheme']>
  semester: NonNullable<StudentLearningScope['semester']>
} {
  return Boolean(scope?.institution && scope.department && scope.programme && scope.scheme && scope.semester)
}

export function isSubjectIdInLearningScope(
  scope: StudentLearningScope | null | undefined,
  subjectId: string | null | undefined,
): boolean {
  if (!subjectId || !hasResolvedLearningScope(scope)) return false
  return scope.subjects.some((subject) => subject.id === subjectId)
}

export function subjectIdsForLearningScope(scope: StudentLearningScope | null | undefined): string[] {
  return hasResolvedLearningScope(scope) ? scope.subjects.map((subject) => subject.id) : []
}

export function topicIdsForLearningScope(scope: StudentLearningScope | null | undefined): string[] {
  if (!hasResolvedLearningScope(scope)) return []
  return scope.subjects.flatMap((subject) =>
    subject.units.flatMap((unit) => unit.topics.map((topic) => topic.id)),
  )
}

export function unitIdsForLearningScope(scope: StudentLearningScope | null | undefined): string[] {
  if (!hasResolvedLearningScope(scope)) return []
  return scope.subjects.flatMap((subject) => subject.units.map((unit) => unit.id))
}

export function lessonIdsForLearningScope(scope: StudentLearningScope | null | undefined): string[] {
  if (!hasResolvedLearningScope(scope)) return []
  return scope.subjects.flatMap((subject) =>
    subject.units.flatMap((unit) => [
      ...unit.lessons.map((lesson) => lesson.id),
      ...unit.topics.flatMap((topic) => topic.lessons.map((lesson) => lesson.id)),
    ]),
  )
}

export function isLessonIdInLearningScope(
  scope: StudentLearningScope | null | undefined,
  lessonId: string | null | undefined,
): boolean {
  return Boolean(findLessonReferenceInLearningScope(scope, lessonId))
}

export function subjectIdForScopedLesson(
  scope: StudentLearningScope | null | undefined,
  lessonId: string | null | undefined,
): string | null {
  return findLessonReferenceInLearningScope(scope, lessonId)?.subjectId ?? null
}

export function topicIdForScopedLesson(
  scope: StudentLearningScope | null | undefined,
  lessonId: string | null | undefined,
): string | null {
  return findLessonReferenceInLearningScope(scope, lessonId)?.topicId ?? null
}

export function findLessonReferenceInLearningScope(
  scope: StudentLearningScope | null | undefined,
  lessonId: string | null | undefined,
): ScopedLessonReference | null {
  if (!lessonId || !hasResolvedLearningScope(scope)) return null

  for (const subject of scope.subjects) {
    for (const unit of subject.units) {
      for (const lesson of unit.lessons) {
        if (lesson.id === lessonId) return lessonReference(scope, subject, unit, null, lesson)
      }
      for (const topic of unit.topics) {
        for (const lesson of topic.lessons) {
          if (lesson.id === lessonId) return lessonReference(scope, subject, unit, topic, lesson)
        }
      }
    }
  }
  return null
}

export function firstLessonReferenceForTopic(
  scope: StudentLearningScope | null | undefined,
  topicId: string | null | undefined,
): ScopedLessonReference | null {
  if (!topicId || !hasResolvedLearningScope(scope)) return null

  for (const subject of scope.subjects) {
    for (const unit of subject.units) {
      const topic = unit.topics.find((item) => item.id === topicId)
      const lesson = topic?.lessons[0]
      if (lesson) return lessonReference(scope, subject, unit, topic, lesson)
    }
  }
  return null
}

function lessonReference(
  scope: StudentLearningScope & {
    programme: NonNullable<StudentLearningScope['programme']>
    semester: NonNullable<StudentLearningScope['semester']>
  },
  subject: LearningSubject,
  unit: LearningSubject['units'][number],
  topic: LearningSubject['units'][number]['topics'][number] | null,
  lesson: LearningSubject['units'][number]['lessons'][number],
): ScopedLessonReference {
  return {
    id: lesson.id,
    title: lesson.title,
    durationMin: lesson.durationMin,
    subjectId: subject.id,
    subjectCode: subject.code,
    unitId: lesson.unitId ?? unit.id,
    unitNumber: unit.number,
    topicId: lesson.topicId ?? topic?.id ?? null,
    canonicalUrl: `/learn/${scope.programme.code}/semester/${scope.semester.number}/subject/${subject.code}/lesson/${lessonRouteSlug(lesson)}`,
  }
}

export function isTopicIdInLearningScope(
  scope: StudentLearningScope | null | undefined,
  topicId: string | null | undefined,
): boolean {
  if (!topicId || !hasResolvedLearningScope(scope)) return false
  return scope.subjects.some((subject) =>
    subject.units.some((unit) => unit.topics.some((topic) => topic.id === topicId)),
  )
}

export function subjectIdForScopedTopic(
  scope: StudentLearningScope | null | undefined,
  topicId: string | null | undefined,
): string | null {
  if (!topicId || !hasResolvedLearningScope(scope)) return null
  for (const subject of scope.subjects) {
    for (const unit of subject.units) {
      if (unit.topics.some((topic) => topic.id === topicId)) return subject.id
    }
  }
  return null
}

export function scopedSubjectWhere(scope: StudentLearningScope): Prisma.SubjectWhereInput {
  if (!hasResolvedLearningScope(scope)) {
    return { id: '__unresolved_learning_scope__' }
  }
  const electiveApplicability: Prisma.SubjectWhereInput = scope.canPreviewDrafts
    ? {}
    : {
        OR: [
          { electiveGroupId: null },
          {
            electiveSelections: {
              some: {
                userId: scope.userId,
                status: 'active',
              },
            },
          },
          ...(scope.classGroup
            ? [{
                classElectiveAllocations: {
                  some: {
                    classGroupId: scope.classGroup.id,
                    status: 'active',
                    OR: [
                      { effectiveFrom: null },
                      { effectiveFrom: { lte: new Date() } },
                    ],
                    AND: [
                      {
                        OR: [
                          { effectiveTo: null },
                          { effectiveTo: { gte: new Date() } },
                        ],
                      },
                    ],
                  },
                },
              }]
            : []),
        ],
      }
  return {
    schemeId: scope.scheme.id,
    semesterId: scope.semester.id,
    ...studentVisibleSubjectWhere({ canPreviewDrafts: scope.canPreviewDrafts }),
    ...electiveApplicability,
  }
}

export function scopedTopicWhere(scope: StudentLearningScope): Prisma.TopicWhereInput {
  return {
    ...studentVisibleTopicWhere({ canPreviewDrafts: scope.canPreviewDrafts }),
    unit: {
      ...studentVisibleUnitWhere({ canPreviewDrafts: scope.canPreviewDrafts }),
      subject: scopedSubjectWhere(scope),
    },
  }
}

export function scopedLessonWhere(scope: StudentLearningScope): Prisma.LessonWhereInput {
  const subjectWhere = scopedSubjectWhere(scope)
  return {
    status: { in: [...PUBLISHED_LESSON_STATUSES] },
    archivedAt: null,
    OR: [
      { unit: { subject: subjectWhere } },
      { topic: { unit: { subject: subjectWhere } } },
    ],
  }
}

export function scopedResourceWhere(scope: StudentLearningScope): Prisma.ResourceWhereInput {
  return {
    ...studentVisibleResourceWhere(),
    subject: scopedSubjectWhere(scope),
  }
}

export function scopedQuestionWhere(scope: StudentLearningScope): Prisma.QuestionWhereInput {
  return {
    ...studentVisibleQuestionWhere(),
    subject: scopedSubjectWhere(scope),
  }
}

export async function findScopedLesson(scope: StudentLearningScope, lessonId: string) {
  if (!hasResolvedLearningScope(scope)) return null
  return db.lesson.findFirst({
    where: { id: lessonId, ...scopedLessonWhere(scope) },
    select: { id: true, title: true },
  })
}

export async function findScopedQuestion(scope: StudentLearningScope, questionId: string) {
  if (!hasResolvedLearningScope(scope)) return null
  return db.question.findFirst({
    where: { id: questionId, ...scopedQuestionWhere(scope) },
    select: { id: true, subjectId: true, topicId: true },
  })
}

export async function findScopedTopic(
  scope: StudentLearningScope,
  input: { topicId: string; subjectId?: string | null; unitNumber?: number | null },
) {
  if (!hasResolvedLearningScope(scope)) return null
  return db.topic.findFirst({
    where: {
      id: input.topicId,
      ...studentVisibleTopicWhere({ canPreviewDrafts: scope.canPreviewDrafts }),
      unit: {
        ...(input.unitNumber ? { number: input.unitNumber } : {}),
        ...studentVisibleUnitWhere({ canPreviewDrafts: scope.canPreviewDrafts }),
        subject: {
          ...scopedSubjectWhere(scope),
          ...(input.subjectId ? { id: input.subjectId } : {}),
        },
      },
    },
    select: { id: true },
  })
}

export async function findScopedUnit(
  scope: StudentLearningScope,
  input: { subjectId: string; unitNumber: number },
) {
  if (!hasResolvedLearningScope(scope)) return null
  return db.unit.findFirst({
    where: {
      number: input.unitNumber,
      ...studentVisibleUnitWhere({ canPreviewDrafts: scope.canPreviewDrafts }),
      subject: { ...scopedSubjectWhere(scope), id: input.subjectId },
    },
    select: { id: true },
  })
}

export async function getStudentLearningScope(
  userId: string,
  options: { subjectId?: string | null; includeSubjects?: boolean } = {},
): Promise<StudentLearningScope | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      institutionId: true,
      schemeId: true,
      departmentCode: true,
      semesterNumber: true,
      division: true,
    },
  })

  if (!user) return null

  const canPreviewDrafts = ['admin', 'coordinator', 'reviewer'].includes(user.role)
  const departmentCode = String(user.departmentCode || '').trim().toUpperCase()
  const semesterNumber = user.semesterNumber ?? null

  if (!isTargetCwitDepartmentCode(departmentCode)) {
    return emptyScope(user, canPreviewDrafts, 'user_department_not_in_lernio_scope')
  }

  const programme = await db.programme.findFirst({
    where: {
      code: { in: [...TARGET_CWIT_PROGRAMME_CODES] },
      status: 'active',
      archivedAt: null,
      department: {
        code: departmentCode,
        status: 'active',
        archivedAt: null,
        institution: user.institutionId ? { id: user.institutionId } : { code: 'CWIT' },
      },
    },
    select: {
      id: true,
      code: true,
      name: true,
      department: {
        select: {
          id: true,
          code: true,
          name: true,
          institution: { select: { id: true, code: true, name: true } },
        },
      },
    },
  })

  if (!programme) {
    return emptyScope(user, canPreviewDrafts, 'active_programme_not_found')
  }

  const scheme = user.schemeId
    ? await db.academicScheme.findFirst({
        where: {
          id: user.schemeId,
          programmeId: programme.id,
          ...studentVisibleSchemeWhere({ canPreviewDrafts }),
        },
        select: { id: true, code: true, name: true, status: true },
      })
    : await db.academicScheme.findFirst({
        where: {
          programmeId: programme.id,
          ...studentVisibleSchemeWhere({ canPreviewDrafts }),
        },
        orderBy: [{ startYear: 'desc' }, { createdAt: 'desc' }],
        select: { id: true, code: true, name: true, status: true },
      })

  if (!scheme) {
    return {
      ...emptyScope(user, canPreviewDrafts, 'active_scheme_not_found'),
      institution: programme.department.institution,
      department: programme.department,
      programme: { id: programme.id, code: programme.code, name: programme.name },
    }
  }

  const semester = semesterNumber
    ? await db.semester.findFirst({
        where: { schemeId: scheme.id, number: semesterNumber },
        select: { id: true, number: true, name: true },
      })
    : null

  if (!semesterNumber || !semester) {
    return {
      ...emptyScope(user, canPreviewDrafts, 'current_semester_not_found'),
      institution: programme.department.institution,
      department: programme.department,
      programme: { id: programme.id, code: programme.code, name: programme.name },
      scheme,
    }
  }

  const classGroup = await db.classGroup.findFirst({
    where: {
      institutionId: programme.department.institution.id,
      programmeId: programme.id,
      schemeId: scheme.id,
      semesterId: semester.id,
      status: 'active',
      ...(user.division && user.division !== 'NOT_SURE' ? { division: user.division } : {}),
    },
    select: { id: true, code: true, name: true, division: true },
    orderBy: { createdAt: 'asc' },
  })

  const subjects = options.includeSubjects === false
    ? []
    : await db.subject.findMany({
        where: {
          ...(options.subjectId ? { id: options.subjectId } : {}),
          ...scopedSubjectWhere({
            userId: user.id,
            role: user.role,
            institution: programme.department.institution,
            department: programme.department,
            programme: { id: programme.id, code: programme.code, name: programme.name },
            scheme,
            semester,
            semesterNumber,
            classGroup,
            canPreviewDrafts,
            subjects: [],
            unresolvedReason: null,
          }),
        },
        select: learningSubjectSelect,
        orderBy: [{ displayOrder: 'asc' }, { code: 'asc' }],
      })

  return {
    userId: user.id,
    role: user.role,
    institution: programme.department.institution,
    department: programme.department,
    programme: { id: programme.id, code: programme.code, name: programme.name },
    scheme,
    semester,
    semesterNumber,
    classGroup,
    canPreviewDrafts,
    subjects,
    unresolvedReason: null,
  }
}

function emptyScope(
  user: { id: string; role: string; semesterNumber: number | null },
  canPreviewDrafts: boolean,
  unresolvedReason: string,
): StudentLearningScope {
  return {
    userId: user.id,
    role: user.role,
    institution: null,
    department: null,
    programme: null,
    scheme: null,
    semester: null,
    semesterNumber: user.semesterNumber ?? null,
    classGroup: null,
    canPreviewDrafts,
    subjects: [],
    unresolvedReason,
  }
}

export function targetDepartmentCodes(): string[] {
  return [...TARGET_CWIT_DEPARTMENT_CODES]
}

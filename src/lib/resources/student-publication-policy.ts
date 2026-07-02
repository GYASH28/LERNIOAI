import type { Prisma } from '@prisma/client'

export const PUBLISHED_LESSON_STATUSES = ['published', 'verified'] as const
export const STUDENT_SCHEME_STATUSES = ['published'] as const
export const PREVIEWABLE_SCHEME_STATUSES = ['draft', 'under_review', 'published'] as const
export const STUDENT_SUBJECT_REVIEW_STATUSES = ['structure_verified', 'content_verified', 'published'] as const
export const STUDENT_STRUCTURE_REVIEW_STATUSES = ['structure_verified', 'content_verified', 'published'] as const
export const STUDENT_QUESTION_STATUSES = ['published', 'verified'] as const
export const STUDENT_QUESTION_REVIEW_STATUSES = ['approved', 'verified', 'published'] as const
export const STUDENT_RESOURCE_VISIBILITIES = ['public', 'published'] as const
export const STUDENT_LESSON_RESOURCE_STATUSES = ['published', 'verified', 'approved'] as const
export const STUDENT_LESSON_RESOURCE_VERIFICATION_STATUSES = ['verified', 'approved'] as const
export const STUDENT_GENERATED_DOCUMENT_STATUSES = ['published', 'approved'] as const

export function studentVisibleSchemeWhere(input: {
  canPreviewDrafts?: boolean
} = {}): Prisma.AcademicSchemeWhereInput {
  return input.canPreviewDrafts
    ? {
        status: { in: [...PREVIEWABLE_SCHEME_STATUSES] },
        archivedAt: null,
      }
    : {
        status: { in: [...STUDENT_SCHEME_STATUSES] },
        archivedAt: null,
      }
}

export function studentVisibleSubjectWhere(input: {
  canPreviewDrafts?: boolean
} = {}): Prisma.SubjectWhereInput {
  return input.canPreviewDrafts
    ? {
        status: { not: 'archived' },
        archivedAt: null,
      }
    : {
        status: 'active',
        reviewStatus: { in: [...STUDENT_SUBJECT_REVIEW_STATUSES] },
        archivedAt: null,
      }
}

export function studentVisibleUnitWhere(input: {
  canPreviewDrafts?: boolean
} = {}): Prisma.UnitWhereInput {
  return input.canPreviewDrafts
    ? {
        status: { not: 'archived' },
        archivedAt: null,
      }
    : {
        status: 'active',
        reviewStatus: { in: [...STUDENT_STRUCTURE_REVIEW_STATUSES] },
        publishedAt: { not: null },
        archivedAt: null,
      }
}

export function studentVisibleTopicWhere(input: {
  canPreviewDrafts?: boolean
} = {}): Prisma.TopicWhereInput {
  return input.canPreviewDrafts
    ? {
        status: { not: 'archived' },
        archivedAt: null,
      }
    : {
        status: 'active',
        reviewStatus: { in: [...STUDENT_STRUCTURE_REVIEW_STATUSES] },
        publishedAt: { not: null },
        archivedAt: null,
      }
}

export function studentVisibleQuestionWhere(): Prisma.QuestionWhereInput {
  return {
    status: { in: [...STUDENT_QUESTION_STATUSES] },
    reviewStatus: { in: [...STUDENT_QUESTION_REVIEW_STATUSES] },
    archivedAt: null,
  }
}

export function studentLessonResourceWhere(): Prisma.LessonResourceWhereInput {
  return {
    status: { in: [...STUDENT_LESSON_RESOURCE_STATUSES] },
    verificationStatus: { in: [...STUDENT_LESSON_RESOURCE_VERIFICATION_STATUSES] },
    resource: studentVisibleResourceWhere(),
  }
}

export function studentGeneratedDocumentWhere(): Prisma.GeneratedLessonDocumentWhereInput {
  return {
    generationStatus: { in: [...STUDENT_GENERATED_DOCUMENT_STATUSES] },
    OR: [
      {
        outputResourceId: null,
        OR: [
          { storageObjectKey: { not: null } },
          { htmlObjectKey: { not: null } },
        ],
      },
      {
        outputResource: studentVisibleResourceWhere(),
      },
    ],
  }
}

export function studentVisibleResourceWhere(): Prisma.ResourceWhereInput {
  return {
    visibility: { in: [...STUDENT_RESOURCE_VISIBILITIES] },
    verified: true,
    moderationStatus: 'clear',
    archivedAt: null,
  }
}

export function isStudentVisibleResource(input: {
  visibility: string | null
  verified: boolean
  moderationStatus: string | null
  archivedAt: Date | string | null
}): boolean {
  return (
    STUDENT_RESOURCE_VISIBILITIES.includes(input.visibility as (typeof STUDENT_RESOURCE_VISIBILITIES)[number]) &&
    input.verified &&
    input.moderationStatus === 'clear' &&
    input.archivedAt === null
  )
}

export function isStudentVisibleSubject(input: {
  status: string | null
  reviewStatus: string | null
  archivedAt: Date | string | null
}): boolean {
  return (
    input.status === 'active' &&
    STUDENT_SUBJECT_REVIEW_STATUSES.includes(
      input.reviewStatus as (typeof STUDENT_SUBJECT_REVIEW_STATUSES)[number],
    ) &&
    input.archivedAt === null
  )
}

export function isStudentVisibleQuestion(input: {
  status: string | null
  reviewStatus: string | null
  archivedAt: Date | string | null
}): boolean {
  return (
    STUDENT_QUESTION_STATUSES.includes(input.status as (typeof STUDENT_QUESTION_STATUSES)[number]) &&
    STUDENT_QUESTION_REVIEW_STATUSES.includes(
      input.reviewStatus as (typeof STUDENT_QUESTION_REVIEW_STATUSES)[number],
    ) &&
    input.archivedAt === null
  )
}

export function isStudentVisibleLessonResource(input: {
  status: string | null
  verificationStatus: string | null
  resource: {
    visibility: string | null
    verified: boolean
    moderationStatus: string | null
    archivedAt: Date | string | null
  }
}): boolean {
  return (
    STUDENT_LESSON_RESOURCE_STATUSES.includes(input.status as (typeof STUDENT_LESSON_RESOURCE_STATUSES)[number]) &&
    STUDENT_LESSON_RESOURCE_VERIFICATION_STATUSES.includes(
      input.verificationStatus as (typeof STUDENT_LESSON_RESOURCE_VERIFICATION_STATUSES)[number],
    ) &&
    isStudentVisibleResource(input.resource)
  )
}

export function isStudentVisibleGeneratedDocument(input: {
  generationStatus: string | null
  outputResourceId: string | null
  storageObjectKey?: string | null
  htmlObjectKey?: string | null
  outputResource: {
    visibility: string | null
    verified: boolean
    moderationStatus: string | null
    archivedAt: Date | string | null
  } | null
}): boolean {
  const statusVisible = STUDENT_GENERATED_DOCUMENT_STATUSES.includes(
    input.generationStatus as (typeof STUDENT_GENERATED_DOCUMENT_STATUSES)[number],
  )
  if (!statusVisible) return false
  if (!input.outputResourceId) return Boolean(input.storageObjectKey || input.htmlObjectKey)
  return input.outputResource ? isStudentVisibleResource(input.outputResource) : false
}

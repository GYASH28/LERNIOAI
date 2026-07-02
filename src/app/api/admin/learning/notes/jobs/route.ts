import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { ApiError, okResponse, withApi } from '@/lib/auth'
import { parseBody } from '@/lib/schemas'
import { requireLearningOpsPreviewAccess } from '@/lib/learning/learning-ops-authority'

const NOTE_JOB_STATES = ['queued', 'running', 'validation_failed', 'awaiting_review', 'completed', 'failed', 'cancelled'] as const
const NOTE_DOCUMENT_TYPES = ['lesson_notes', 'quick_notes', 'revision_sheet', 'formula_sheet'] as const
const ACTIVE_JOB_STATES = ['queued', 'running', 'validation_failed', 'awaiting_review'] as const

const CreateLessonNoteGenerationJobSchema = z.object({
  lessonId: z.string().min(1),
  documentType: z.enum(NOTE_DOCUMENT_TYPES).default('lesson_notes'),
  templateVersion: z.string().trim().min(1).max(80).default('lesson-notes-v1'),
  forceNew: z.boolean().default(false),
})

export async function GET(request: Request) {
  return withApi(async () => {
    const access = await requireLearningOpsPreviewAccess()
    assertCanManageNoteGeneration(access)

    const url = new URL(request.url)
    const take = Math.min(100, Math.max(1, Number(url.searchParams.get('take') || 50)))
    const state = url.searchParams.get('state')
    const lessonId = url.searchParams.get('lessonId')
    const where: Prisma.ContentGenerationJobWhereInput = {
      AND: [
        { jobType: { in: [...NOTE_DOCUMENT_TYPES] } },
        state && (NOTE_JOB_STATES as readonly string[]).includes(state) ? { state } : {},
        lessonId ? { lessonId } : {},
        lessonSubjectScopeWhere(access.subjectIds),
      ],
    }

    const jobs = await db.contentGenerationJob.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take,
      select: jobResponseSelect,
    })

    return okResponse({ jobs })
  })
}

export async function POST(request: Request) {
  return withApi(async () => {
    const access = await requireLearningOpsPreviewAccess()
    assertCanManageNoteGeneration(access)
    const body = await parseBody(request, CreateLessonNoteGenerationJobSchema)

    const lesson = await db.lesson.findUnique({
      where: { id: body.lessonId },
      select: {
        id: true,
        title: true,
        status: true,
        unit: { select: { subjectId: true } },
        topic: { select: { unit: { select: { subjectId: true } } } },
      },
    })

    if (!lesson) throw new ApiError('NOT_FOUND', 'Lesson not found.', 404, false)
    const subjectId = lesson.unit?.subjectId ?? lesson.topic?.unit.subjectId ?? null
    if (!subjectId) {
      throw new ApiError('VALIDATION_ERROR', 'Lesson is not attached to a subject.', 400, false)
    }
    if (access.subjectIds !== null && !access.subjectIds.includes(subjectId)) {
      throw new ApiError('FORBIDDEN', 'This lesson is outside your learning-operations scope.', 403, false)
    }
    if (!['published', 'verified'].includes(lesson.status)) {
      throw new ApiError('VALIDATION_ERROR', 'Only published or verified lessons can queue generated notes.', 400, false)
    }

    if (!body.forceNew) {
      const existing = await db.contentGenerationJob.findFirst({
        where: {
          lessonId: lesson.id,
          jobType: body.documentType,
          state: { in: [...ACTIVE_JOB_STATES] },
        },
        orderBy: { updatedAt: 'desc' },
        select: jobResponseSelect,
      })
      if (existing) return okResponse({ job: existing, reused: true })
    }

    const job = await db.$transaction(async (tx) => {
      const created = await tx.contentGenerationJob.create({
        data: {
          lessonId: lesson.id,
          jobType: body.documentType,
          templateVersion: body.templateVersion,
          state: 'queued',
          requestedById: access.authority.user.id,
        },
        select: jobResponseSelect,
      })

      await tx.auditEvent.create({
        data: {
          actorUserId: access.authority.user.id,
          action: 'lesson_note.generation_queued',
          entityType: 'ContentGenerationJob',
          entityId: created.id,
          summary: `Queued ${body.documentType.replace(/_/g, ' ')} generation for ${lesson.title}`,
          metadata: JSON.stringify({
            lessonId: lesson.id,
            documentType: body.documentType,
            templateVersion: body.templateVersion,
            subjectId,
          }),
        },
      })

      return created
    })

    return okResponse({ job, reused: false })
  })
}

function assertCanManageNoteGeneration(access: Awaited<ReturnType<typeof requireLearningOpsPreviewAccess>>) {
  const canQueue =
    access.authority.activeRoles.includes('admin') ||
    access.authority.capabilities.includes('ai.content_draft') ||
    access.authority.capabilities.includes('ai.content_review')

  if (!canQueue) {
    throw new ApiError('FORBIDDEN', 'You do not have permission to manage generated notes.', 403, false)
  }
}

function lessonSubjectScopeWhere(subjectIds: readonly string[] | null): Prisma.ContentGenerationJobWhereInput {
  if (subjectIds === null) return {}
  if (subjectIds.length === 0) return { id: { in: [] } }
  return {
    lesson: {
      OR: [
        { unit: { subjectId: { in: [...subjectIds] } } },
        { topic: { unit: { subjectId: { in: [...subjectIds] } } } },
      ],
    },
  }
}

const jobResponseSelect = {
  id: true,
  lessonId: true,
  jobType: true,
  state: true,
  attemptCount: true,
  provider: true,
  model: true,
  templateVersion: true,
  validationJson: true,
  errorCode: true,
  errorMessage: true,
  leaseOwner: true,
  leaseUntil: true,
  startedAt: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
  lesson: {
    select: {
      id: true,
      title: true,
      status: true,
      unit: {
        select: {
          number: true,
          subject: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      },
      topic: {
        select: {
          title: true,
          unit: {
            select: {
              number: true,
              subject: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  },
  generatedDocument: {
    select: {
      id: true,
      documentType: true,
      generationStatus: true,
      version: true,
      htmlObjectKey: true,
      storageObjectKey: true,
      generatedAt: true,
      reviewedAt: true,
      publishedAt: true,
    },
  },
} as const

import 'server-only'

import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { db } from '@/lib/db'
import { ApiError } from '@/lib/auth'
import { writeAuditEvent } from '@/lib/authority/audit'
import { LESSON_RESOURCE_ROLES } from '@/lib/resources/lesson-resource-policy'

export const UpsertResourceProviderSchema = z.object({
  institutionId: z.string().min(1).nullable().optional(),
  key: z.string().trim().min(2).max(80).regex(/^[a-z0-9_-]+$/i),
  name: z.string().trim().min(2).max(160),
  providerType: z.string().trim().min(2).max(80),
  baseUrl: z.string().trim().url().max(1000).nullable().optional(),
  policyJson: z.string().trim().max(5000).nullable().optional(),
  status: z.enum(['active', 'paused', 'disabled']).default('active'),
})

export const ReviewResourceSchema = z.object({
  resourceId: z.string().min(1),
  decision: z.enum(['approved', 'rejected', 'changes_requested', 'held']),
  note: z.string().trim().max(2000).nullable().optional(),
  rubricJson: z.string().trim().max(5000).nullable().optional(),
})

export const UpsertLessonResourceMappingSchema = z.object({
  resourceId: z.string().min(1),
  lessonId: z.string().min(1),
  role: z.enum(LESSON_RESOURCE_ROLES).default('reference'),
  decision: z.enum(['draft', 'approve']).default('draft'),
  sortOrder: z.number().int().min(0).max(1000).default(0),
  isRequired: z.boolean().default(false),
  startSeconds: z.number().int().min(0).nullable().optional(),
  endSeconds: z.number().int().min(0).nullable().optional(),
  coveragePercentage: z.number().int().min(1).max(100).nullable().optional(),
  sourceEvidence: z.string().trim().max(2000).nullable().optional(),
})

export async function listResourceReviewQueue(input: {
  page?: number
  pageSize?: number
  status?: string
  subjectIds?: readonly string[] | null
} = {}) {
  const page = Math.max(1, input.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 20))
  const statusWhere: Prisma.ResourceWhereInput = input.status
    ? { reviewStatus: input.status }
    : { reviewStatus: { in: ['pending', 'changes_requested'] } }
  const scopeWhere: Prisma.ResourceWhereInput =
    input.subjectIds === undefined || input.subjectIds === null
      ? {}
      : input.subjectIds.length
        ? { subjectId: { in: [...input.subjectIds] } }
        : { id: { in: [] } }
  const where: Prisma.ResourceWhereInput = { AND: [statusWhere, scopeWhere] }

  const [total, resources] = await Promise.all([
    db.resource.count({ where }),
    db.resource.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        type: true,
        url: true,
        provider: true,
        canonicalUrl: true,
        language: true,
        reviewStatus: true,
        moderationStatus: true,
        linkHealth: true,
        qualityScore: true,
        createdAt: true,
        subject: {
          select: {
            id: true,
            code: true,
            name: true,
            scheme: { select: { code: true, programmeId: true } },
          },
        },
        _count: { select: { topicMappings: true, reviews: true, lessonResources: true } },
      },
    }),
  ])

  return { resources, pagination: { total, page, pageSize } }
}

export async function listLessonResourceMappingOptions(input: {
  subjectIds?: readonly string[] | null
} = {}) {
  const subjectScope: Prisma.LessonWhereInput =
    input.subjectIds === undefined || input.subjectIds === null
      ? {}
      : input.subjectIds.length
        ? {
            OR: [
              { unit: { subjectId: { in: [...input.subjectIds] } } },
              { topic: { unit: { subjectId: { in: [...input.subjectIds] } } } },
            ],
          }
        : { id: { in: [] } }

  return db.lesson.findMany({
    where: {
      AND: [
        subjectScope,
        { status: { not: 'archived' } },
      ],
    },
    orderBy: [
      { unit: { subject: { displayOrder: 'asc' } } },
      { unit: { number: 'asc' } },
      { order: 'asc' },
      { title: 'asc' },
    ],
    select: {
      id: true,
      title: true,
      status: true,
      unit: {
        select: {
          number: true,
          title: true,
          subjectId: true,
          subject: { select: { code: true, name: true } },
        },
      },
      topic: {
        select: {
          title: true,
          unit: {
            select: {
              number: true,
              title: true,
              subjectId: true,
              subject: { select: { code: true, name: true } },
            },
          },
        },
      },
    },
  })
}

export async function listResourceProviders() {
  return db.resourceProvider.findMany({
    orderBy: [{ status: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      key: true,
      name: true,
      providerType: true,
      baseUrl: true,
      status: true,
      lastHealthCheckAt: true,
      updatedAt: true,
    },
  })
}

export async function upsertResourceProvider(input: z.infer<typeof UpsertResourceProviderSchema>, actorUserId: string) {
  const parsed = UpsertResourceProviderSchema.parse(input)
  const key = parsed.key.toLowerCase()

  const provider = await db.$transaction(async (tx) => {
    const existing = await tx.resourceProvider.findFirst({
      where: { institutionId: parsed.institutionId ?? null, key },
      select: { id: true },
    })

    if (existing) {
      return tx.resourceProvider.update({
        where: { id: existing.id },
        data: {
          name: parsed.name,
          providerType: parsed.providerType,
          baseUrl: parsed.baseUrl ?? null,
          policyJson: parsed.policyJson ?? null,
          status: parsed.status,
        },
        select: { id: true, key: true, name: true, status: true },
      })
    }

    return tx.resourceProvider.create({
      data: {
        institutionId: parsed.institutionId ?? null,
        key,
        name: parsed.name,
        providerType: parsed.providerType,
        baseUrl: parsed.baseUrl ?? null,
        policyJson: parsed.policyJson ?? null,
        status: parsed.status,
      },
      select: { id: true, key: true, name: true, status: true },
    })
  })

  await writeAuditEvent({
    actorUserId,
    action: 'resource.provider.upserted',
    entityType: 'ResourceProvider',
    entityId: provider.id,
    summary: `Updated resource provider ${provider.name}`,
    metadata: { key: provider.key, status: provider.status },
  })

  return provider
}

export async function reviewResource(
  input: z.infer<typeof ReviewResourceSchema>,
  actorUserId: string,
  options: { allowedSubjectIds?: readonly string[] | null } = {},
) {
  const parsed = ReviewResourceSchema.parse(input)
  const resource = await db.resource.findUnique({
    where: { id: parsed.resourceId },
    select: { id: true, title: true, reviewStatus: true, subjectId: true },
  })

  if (!resource) {
    throw new ApiError('NOT_FOUND', 'Resource not found.', 404, false)
  }
  if (
    options.allowedSubjectIds !== undefined &&
    options.allowedSubjectIds !== null &&
    !options.allowedSubjectIds.includes(resource.subjectId)
  ) {
    throw new ApiError('FORBIDDEN', 'This resource is outside your review scope.', 403, false)
  }

  const nextStatus = parsed.decision === 'approved' ? 'approved' : parsed.decision
  const moderationStatus = parsed.decision === 'held' ? 'held' : undefined

  return db.$transaction(async (tx) => {
    await tx.resourceReview.create({
      data: {
        resourceId: resource.id,
        reviewerId: actorUserId,
        decision: parsed.decision,
        note: parsed.note ?? null,
        rubricJson: parsed.rubricJson ?? null,
      },
    })

    const updated = await tx.resource.update({
      where: { id: resource.id },
      data: {
        reviewStatus: nextStatus,
        moderationStatus,
        reviewedById: actorUserId,
        reviewedAt: new Date(),
        verified: parsed.decision === 'approved',
        visibility: parsed.decision === 'approved' ? 'published' : undefined,
      },
      select: { id: true, title: true, reviewStatus: true, moderationStatus: true },
    })

    await tx.reviewDecision.create({
      data: {
        entityType: 'Resource',
        entityId: resource.id,
        reviewerId: actorUserId,
        decision: parsed.decision,
        note: parsed.note ?? null,
        rubricJson: parsed.rubricJson ?? null,
        priorStatus: resource.reviewStatus,
        nextStatus,
      },
    })

    await tx.auditEvent.create({
      data: {
        actorUserId,
        action: 'resource.reviewed',
        entityType: 'Resource',
        entityId: resource.id,
        summary: `Reviewed resource ${resource.title}`,
        beforeSummary: resource.reviewStatus,
        afterSummary: nextStatus,
        metadata: JSON.stringify({ decision: parsed.decision }),
      },
    })

    return updated
  })
}

export async function upsertLessonResourceMapping(
  input: z.infer<typeof UpsertLessonResourceMappingSchema>,
  actorUserId: string,
  options: { allowedSubjectIds?: readonly string[] | null } = {},
) {
  const parsed = UpsertLessonResourceMappingSchema.parse(input)
  if (parsed.endSeconds != null && parsed.startSeconds != null && parsed.endSeconds <= parsed.startSeconds) {
    throw new ApiError('VALIDATION_ERROR', 'End time must be after start time.', 400, false)
  }
  if (parsed.decision === 'approve' && !parsed.sourceEvidence) {
    throw new ApiError('VALIDATION_ERROR', 'Reviewer evidence is required before approving a lesson resource mapping.', 400, false)
  }

  const [resource, lesson] = await Promise.all([
    db.resource.findUnique({
      where: { id: parsed.resourceId },
      select: {
        id: true,
        title: true,
        subjectId: true,
        reviewStatus: true,
        verified: true,
        visibility: true,
        moderationStatus: true,
        archivedAt: true,
      },
    }),
    db.lesson.findUnique({
      where: { id: parsed.lessonId },
      select: {
        id: true,
        title: true,
        status: true,
        unit: { select: { subjectId: true } },
        topic: { select: { unit: { select: { subjectId: true } } } },
      },
    }),
  ])

  if (!resource) throw new ApiError('NOT_FOUND', 'Resource not found.', 404, false)
  if (!lesson) throw new ApiError('NOT_FOUND', 'Lesson not found.', 404, false)

  if (
    options.allowedSubjectIds !== undefined &&
    options.allowedSubjectIds !== null &&
    !options.allowedSubjectIds.includes(resource.subjectId)
  ) {
    throw new ApiError('FORBIDDEN', 'This resource is outside your review scope.', 403, false)
  }

  const lessonSubjectId = lesson.unit?.subjectId ?? lesson.topic?.unit.subjectId ?? null
  if (!lessonSubjectId || lessonSubjectId !== resource.subjectId) {
    throw new ApiError('VALIDATION_ERROR', 'Lesson and resource must belong to the same subject.', 400, false)
  }

  if (parsed.decision === 'approve') {
    const resourceReady =
      resource.reviewStatus === 'approved' &&
      resource.verified &&
      ['public', 'published'].includes(resource.visibility) &&
      resource.moderationStatus === 'clear' &&
      !resource.archivedAt
    if (!resourceReady) {
      throw new ApiError('VALIDATION_ERROR', 'Only approved, verified, clear resources can be approved for lessons.', 400, false)
    }
    if (!['published', 'verified', 'active'].includes(lesson.status)) {
      throw new ApiError('VALIDATION_ERROR', 'Only published or verified lessons can receive approved resource mappings.', 400, false)
    }
  }

  const nextStatus = parsed.decision === 'approve' ? 'approved' : 'draft'
  const nextVerification = parsed.decision === 'approve' ? 'verified' : 'pending'
  const isPrimary = parsed.role === 'primary_video'

  return db.$transaction(async (tx) => {
    const existing = await tx.lessonResource.findUnique({
      where: {
        lessonId_resourceId_role: {
          lessonId: parsed.lessonId,
          resourceId: parsed.resourceId,
          role: parsed.role,
        },
      },
      select: { id: true, status: true, verificationStatus: true },
    })

    const data = {
      sortOrder: parsed.sortOrder,
      isRequired: parsed.isRequired,
      isPrimary,
      startSeconds: parsed.startSeconds ?? null,
      endSeconds: parsed.endSeconds ?? null,
      coveragePercentage: parsed.coveragePercentage ?? null,
      sourceEvidence: parsed.sourceEvidence ?? null,
      status: nextStatus,
      verificationStatus: nextVerification,
    }

    const mapping = existing
      ? await tx.lessonResource.update({
          where: { id: existing.id },
          data,
          select: lessonResourceMappingSelect,
        })
      : await tx.lessonResource.create({
          data: {
            lessonId: parsed.lessonId,
            resourceId: parsed.resourceId,
            role: parsed.role,
            ...data,
          },
          select: lessonResourceMappingSelect,
        })

    if (isPrimary && nextStatus === 'approved') {
      await tx.lessonResource.updateMany({
        where: {
          lessonId: parsed.lessonId,
          role: 'primary_video',
          id: { not: mapping.id },
        },
        data: { isPrimary: false },
      })
    }

    await tx.auditEvent.create({
      data: {
        actorUserId,
        action: parsed.decision === 'approve' ? 'lesson_resource.approved' : 'lesson_resource.drafted',
        entityType: 'LessonResource',
        entityId: mapping.id,
        summary: `Mapped resource ${resource.title} to lesson ${lesson.title}`,
        beforeSummary: existing ? `${existing.status}/${existing.verificationStatus}` : null,
        afterSummary: `${nextStatus}/${nextVerification}`,
        metadata: JSON.stringify({
          resourceId: resource.id,
          lessonId: lesson.id,
          role: parsed.role,
          sourceEvidence: parsed.sourceEvidence ?? null,
        }),
      },
    })

    return mapping
  })
}

export async function getResourceGovernanceSnapshot() {
  const [pending, approved, held, providers, mappings] = await Promise.all([
    db.resource.count({ where: { reviewStatus: 'pending' } }),
    db.resource.count({ where: { reviewStatus: 'approved' } }),
    db.resource.count({ where: { moderationStatus: 'held' } }),
    db.resourceProvider.count({ where: { status: 'active' } }),
    db.resourceTopicMapping.count(),
  ])

  return { pending, approved, held, providers, mappings }
}

const lessonResourceMappingSelect = {
  id: true,
  lessonId: true,
  resourceId: true,
  role: true,
  sortOrder: true,
  isPrimary: true,
  isRequired: true,
  status: true,
  verificationStatus: true,
  sourceEvidence: true,
} as const

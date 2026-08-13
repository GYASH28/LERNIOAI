import 'server-only'

import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { ApiError } from '@/lib/auth'
import { db as defaultDb } from '@/lib/db'
import { LESSON_RESOURCE_ROLES } from '@/lib/resources/lesson-resource-policy'

const MappingStatusSchema = z.enum([
  'blocked_missing_manifest_subject',
  'blocked_unplaced_official_subject',
  'blocked_missing_lesson_structure',
  'ready_for_lesson_mapping_review',
])

const QueueSubjectMappingSchema = z.object({
  programmeCode: z.string().nullable(),
  departmentCode: z.string().nullable(),
  schemeCode: z.string().nullable(),
  semesterNumber: z.number().int().positive().nullable(),
  subjectCode: z.string().min(1),
  subjectName: z.string().nullable(),
  subjectVerificationStatus: z.string().nullable(),
  curriculumManifest: z.string().nullable(),
  lessonSlug: z.string().nullable(),
  unitNumber: z.number().int().positive().nullable(),
  mappingStatus: MappingStatusSchema,
  blockers: z.array(z.string()),
})

const QueueReviewItemSchema = z.object({
  candidateId: z.string().min(1),
  role: z.enum(LESSON_RESOURCE_ROLES),
  resourceKind: z.enum(['video', 'playlist']),
  originalUrl: z.string().min(1),
  canonicalUrl: z.string().min(1),
  externalId: z.string().min(1),
  videoId: z.string().nullable(),
  playlistId: z.string().nullable(),
  title: z.string().nullable(),
  channel: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  embeddable: z.boolean().nullable(),
  metadataStatus: z.string().min(1),
  availabilityStatus: z.string().min(1),
  language: z.enum(['en', 'hi', 'hinglish']).default('en'),
  sourceEvidence: z.object({
    sourceId: z.string().min(1),
    sourcePdf: z.string().nullable(),
    sourcePage: z.number().int().positive().nullable(),
  }),
  officialSubjectCodes: z.array(z.string()),
  programmeCodes: z.array(z.string()),
  subjectMappings: z.array(QueueSubjectMappingSchema),
  reviewRequired: z.array(z.string()),
  publicationStatus: z.literal('draft'),
}).passthrough()

const YouTubeCandidateReviewQueueForPromotionSchema = z.object({
  items: z.array(QueueReviewItemSchema),
}).passthrough()

export const PromoteYouTubeCandidateMappingSchema = z.object({
  candidateId: z.string().min(1),
  subjectCode: z.string().min(1),
  lessonId: z.string().min(1),
  role: z.enum(LESSON_RESOURCE_ROLES).optional(),
  decision: z.enum(['draft', 'approve']).default('draft'),
  sortOrder: z.number().int().min(0).max(1000).default(0),
  isRequired: z.boolean().default(false),
  startSeconds: z.number().int().min(0).nullable().optional(),
  endSeconds: z.number().int().min(0).nullable().optional(),
  coveragePercentage: z.number().int().min(1).max(100).nullable().optional(),
  sourceEvidence: z.string().trim().max(2000).nullable().optional(),
  title: z.string().trim().min(1).max(240).nullable().optional(),
  language: z.enum(['en', 'hi', 'hinglish']).optional(),
})

export const PromoteYouTubeCandidateMappingsSchema = z.object({
  decisions: z.array(PromoteYouTubeCandidateMappingSchema).min(1).max(200),
})

export type PromoteYouTubeCandidateMappingInput = z.infer<typeof PromoteYouTubeCandidateMappingSchema>
export type PromoteYouTubeCandidateMappingsInput = z.infer<typeof PromoteYouTubeCandidateMappingsSchema>

export interface PromoteYouTubeCandidateMappingsResult {
  dryRun: boolean
  promoted: PromotedYouTubeCandidateMapping[]
}

export interface PromotedYouTubeCandidateMapping {
  candidateId: string
  subjectCode: string
  lessonId: string
  decision: 'draft' | 'approve'
  resourceId: string | null
  lessonResourceId: string | null
  status: 'validated' | 'written'
}

export interface YouTubeCandidatePromotionDb {
  subject: {
    findFirst(args: Prisma.SubjectFindFirstArgs): Promise<PromotionSubject | null>
  }
  lesson: {
    findUnique(args: Prisma.LessonFindUniqueArgs): Promise<PromotionLesson | null>
  }
  resource: PromotionResourceDelegate
  resourceReview: {
    create(args: Prisma.ResourceReviewCreateArgs): Promise<unknown>
  }
  reviewDecision: {
    create(args: Prisma.ReviewDecisionCreateArgs): Promise<unknown>
  }
  lessonResource: PromotionLessonResourceDelegate
  auditEvent: {
    create(args: Prisma.AuditEventCreateArgs): Promise<unknown>
  }
  $transaction<T>(callback: (tx: YouTubeCandidatePromotionTransaction) => Promise<T>): Promise<T>
}

interface YouTubeCandidatePromotionTransaction {
  resource: PromotionResourceDelegate
  resourceReview: {
    create(args: Prisma.ResourceReviewCreateArgs): Promise<unknown>
  }
  reviewDecision: {
    create(args: Prisma.ReviewDecisionCreateArgs): Promise<unknown>
  }
  lessonResource: PromotionLessonResourceDelegate
  auditEvent: {
    create(args: Prisma.AuditEventCreateArgs): Promise<unknown>
  }
}

interface PromotionResourceDelegate {
  findFirst(args: Prisma.ResourceFindFirstArgs): Promise<PromotionResource | null>
  create(args: Prisma.ResourceCreateArgs): Promise<PromotionResource>
  update(args: Prisma.ResourceUpdateArgs): Promise<PromotionResource>
}

interface PromotionLessonResourceDelegate {
  findUnique(args: Prisma.LessonResourceFindUniqueArgs): Promise<PromotionLessonResource | null>
  create(args: Prisma.LessonResourceCreateArgs): Promise<PromotionLessonResource>
  update(args: Prisma.LessonResourceUpdateArgs): Promise<PromotionLessonResource>
  updateMany(args: Prisma.LessonResourceUpdateManyArgs): Promise<unknown>
}

type PromotionSubject = {
  id: string
  code: string
  name: string
}

type PromotionLesson = {
  id: string
  title: string
  status: string
  unit: { subjectId: string } | null
  topic: { unit: { subjectId: string } } | null
}

type PromotionResource = {
  id: string
  title: string
  reviewStatus: string
  verified: boolean
  visibility: string
  moderationStatus: string
  subjectId: string
  archivedAt: Date | null
}

type PromotionLessonResource = {
  id: string
  status: string
  verificationStatus: string
}

type QueueForPromotion = z.infer<typeof YouTubeCandidateReviewQueueForPromotionSchema>
type QueueReviewItem = z.infer<typeof QueueReviewItemSchema>
type QueueSubjectMapping = z.infer<typeof QueueSubjectMappingSchema>

const resourceSelect = {
  id: true,
  title: true,
  reviewStatus: true,
  verified: true,
  visibility: true,
  moderationStatus: true,
  subjectId: true,
  archivedAt: true,
} satisfies Prisma.ResourceSelect

const lessonResourceSelect = {
  id: true,
  status: true,
  verificationStatus: true,
} satisfies Prisma.LessonResourceSelect

export async function promoteYouTubeCandidateMappings(input: {
  reviewQueue: unknown
  decisions: unknown
  actorUserId: string
  allowedSubjectIds?: readonly string[] | null
  dryRun?: boolean
  db?: YouTubeCandidatePromotionDb
}): Promise<PromoteYouTubeCandidateMappingsResult> {
  const queue = YouTubeCandidateReviewQueueForPromotionSchema.parse(input.reviewQueue)
  const parsed = PromoteYouTubeCandidateMappingsSchema.parse(input.decisions)
  const client = input.db ?? (defaultDb as unknown as YouTubeCandidatePromotionDb)
  const dryRun = input.dryRun ?? false
  const promoted: PromotedYouTubeCandidateMapping[] = []

  for (const decision of parsed.decisions) {
    promoted.push(await promoteOne({
      client,
      queue,
      decision,
      actorUserId: input.actorUserId,
      allowedSubjectIds: input.allowedSubjectIds,
      dryRun,
    }))
  }

  return { dryRun, promoted }
}

async function promoteOne(input: {
  client: YouTubeCandidatePromotionDb
  queue: QueueForPromotion
  decision: PromoteYouTubeCandidateMappingInput
  actorUserId: string
  allowedSubjectIds?: readonly string[] | null
  dryRun: boolean
}): Promise<PromotedYouTubeCandidateMapping> {
  const item = findCandidate(input.queue, input.decision.candidateId)
  const mapping = findSubjectMapping(item, input.decision.subjectCode)
  assertMappingReady(item, mapping, input.decision)

  const [subject, lesson] = await Promise.all([
    input.client.subject.findFirst({
      where: {
        code: mapping.subjectCode,
        ...(mapping.schemeCode || mapping.programmeCode
          ? {
              scheme: {
                ...(mapping.schemeCode ? { code: mapping.schemeCode } : {}),
                ...(mapping.programmeCode ? { programme: { code: mapping.programmeCode } } : {}),
              },
            }
          : {}),
      },
      select: { id: true, code: true, name: true },
    }),
    input.client.lesson.findUnique({
      where: { id: input.decision.lessonId },
      select: {
        id: true,
        title: true,
        status: true,
        unit: { select: { subjectId: true } },
        topic: { select: { unit: { select: { subjectId: true } } } },
      },
    }),
  ])

  if (!subject) {
    throw new ApiError('NOT_FOUND', `Subject ${mapping.subjectCode} was not found in the database.`, 404, false)
  }
  if (!lesson) {
    throw new ApiError('NOT_FOUND', `Lesson ${input.decision.lessonId} was not found in the database.`, 404, false)
  }
  if (
    input.allowedSubjectIds !== undefined &&
    input.allowedSubjectIds !== null &&
    !input.allowedSubjectIds.includes(subject.id)
  ) {
    throw new ApiError('FORBIDDEN', 'This YouTube candidate is outside your resource review scope.', 403, false)
  }

  const lessonSubjectId = lesson.unit?.subjectId ?? lesson.topic?.unit.subjectId ?? null
  if (lessonSubjectId !== subject.id) {
    throw new ApiError('VALIDATION_ERROR', 'Selected lesson does not belong to the reviewed subject mapping.', 400, false)
  }
  if (input.decision.decision === 'approve' && !['published', 'verified', 'active'].includes(lesson.status)) {
    throw new ApiError('VALIDATION_ERROR', 'Only published or verified lessons can receive approved YouTube mappings.', 400, false)
  }

  if (input.dryRun) {
    return {
      candidateId: item.candidateId,
      subjectCode: mapping.subjectCode,
      lessonId: lesson.id,
      decision: input.decision.decision,
      resourceId: null,
      lessonResourceId: null,
      status: 'validated',
    }
  }

  return input.client.$transaction(async (tx) => {
    const resource = await upsertCandidateResource(tx, {
      item,
      mapping,
      subject,
      decision: input.decision,
      actorUserId: input.actorUserId,
    })
    const lessonResource = await upsertCandidateLessonResource(tx, {
      resource,
      lesson,
      item,
      decision: input.decision,
      actorUserId: input.actorUserId,
    })

    return {
      candidateId: item.candidateId,
      subjectCode: mapping.subjectCode,
      lessonId: lesson.id,
      decision: input.decision.decision,
      resourceId: resource.id,
      lessonResourceId: lessonResource.id,
      status: 'written',
    }
  })
}

async function upsertCandidateResource(
  tx: YouTubeCandidatePromotionTransaction,
  input: {
    item: QueueReviewItem
    mapping: QueueSubjectMapping
    subject: PromotionSubject
    decision: PromoteYouTubeCandidateMappingInput
    actorUserId: string
  },
): Promise<PromotionResource> {
  const approved = input.decision.decision === 'approve'
  const existing = await tx.resource.findFirst({
    where: {
      subjectId: input.subject.id,
      OR: [
        { provider: 'youtube', externalId: input.item.externalId },
        { canonicalUrl: input.item.canonicalUrl },
      ],
    },
    select: resourceSelect,
  })
  const title =
    input.decision.title ??
    input.item.title ??
    `${input.mapping.subjectName ?? input.mapping.subjectCode} YouTube ${input.item.resourceKind}`
  const language = input.decision.language ?? input.item.language
  const qualityRubricJson = JSON.stringify({
    youtubeCandidateId: input.item.candidateId,
    sourceEvidence: input.item.sourceEvidence,
    reviewEvidence: input.decision.sourceEvidence ?? null,
    availabilityStatus: input.item.availabilityStatus,
    channel: input.item.channel,
  })
  const createData: Prisma.ResourceCreateInput = {
    title,
    type: 'video_link',
    url: input.item.canonicalUrl,
    provider: 'youtube',
    canonicalUrl: input.item.canonicalUrl,
    externalId: input.item.externalId,
    thumbnailUrl: input.item.thumbnailUrl,
    subject: { connect: { id: input.subject.id } },
    source: 'platform',
    visibility: approved ? 'published' : 'submitted',
    verified: approved,
    reviewStatus: approved ? 'approved' : 'pending',
    moderationStatus: 'clear',
    reviewedById: approved ? input.actorUserId : null,
    reviewedAt: approved ? new Date() : null,
    language,
    qualityRubricJson,
  }
  const updateData: Prisma.ResourceUpdateInput = {
    title,
    url: input.item.canonicalUrl,
    provider: 'youtube',
    canonicalUrl: input.item.canonicalUrl,
    externalId: input.item.externalId,
    thumbnailUrl: input.item.thumbnailUrl,
    language,
    qualityRubricJson,
    ...(approved
      ? {
          visibility: 'published',
          verified: true,
          reviewStatus: 'approved',
          moderationStatus: 'clear',
          reviewedById: input.actorUserId,
          reviewedAt: new Date(),
        }
      : {}),
  }

  const resource = existing
    ? await tx.resource.update({
        where: { id: existing.id },
        data: updateData,
        select: resourceSelect,
      })
    : await tx.resource.create({
        data: createData,
        select: resourceSelect,
      })

  if (approved) {
    await tx.resourceReview.create({
      data: {
        resourceId: resource.id,
        reviewerId: input.actorUserId,
        decision: 'approved',
        note: input.decision.sourceEvidence ?? null,
        rubricJson: qualityRubricJson,
      },
    })
    await tx.reviewDecision.create({
      data: {
        entityType: 'Resource',
        entityId: resource.id,
        reviewerId: input.actorUserId,
        decision: 'approved',
        note: input.decision.sourceEvidence ?? null,
        rubricJson: qualityRubricJson,
        priorStatus: existing?.reviewStatus ?? 'new',
        nextStatus: 'approved',
      },
    })
  }

  await tx.auditEvent.create({
    data: {
      actorUserId: input.actorUserId,
      action: approved ? 'youtube_candidate.resource_approved' : 'youtube_candidate.resource_drafted',
      entityType: 'Resource',
      entityId: resource.id,
      summary: `Promoted YouTube candidate ${input.item.candidateId} for ${input.mapping.subjectCode}`,
      beforeSummary: existing?.reviewStatus ?? null,
      afterSummary: resource.reviewStatus,
      metadata: JSON.stringify({
        candidateId: input.item.candidateId,
        canonicalUrl: input.item.canonicalUrl,
        subjectCode: input.mapping.subjectCode,
        sourceEvidence: input.item.sourceEvidence,
      }),
    },
  })

  return resource
}

async function upsertCandidateLessonResource(
  tx: YouTubeCandidatePromotionTransaction,
  input: {
    resource: PromotionResource
    lesson: PromotionLesson
    item: QueueReviewItem
    decision: PromoteYouTubeCandidateMappingInput
    actorUserId: string
  },
): Promise<PromotionLessonResource> {
  const approved = input.decision.decision === 'approve'
  const role = input.decision.role ?? input.item.role
  const existing = await tx.lessonResource.findUnique({
    where: {
      lessonId_resourceId_role: {
        lessonId: input.lesson.id,
        resourceId: input.resource.id,
        role,
      },
    },
    select: lessonResourceSelect,
  })
  const isPrimary = role === 'primary_video'
  const data = {
    sortOrder: input.decision.sortOrder,
    isRequired: input.decision.isRequired,
    isPrimary,
    startSeconds: input.decision.startSeconds ?? null,
    endSeconds: input.decision.endSeconds ?? null,
    coveragePercentage: input.decision.coveragePercentage ?? null,
    sourceEvidence: input.decision.sourceEvidence ?? null,
    status: approved ? 'approved' : 'draft',
    verificationStatus: approved ? 'verified' : 'pending',
  }

  const mapping = existing
    ? await tx.lessonResource.update({
        where: { id: existing.id },
        data,
        select: lessonResourceSelect,
      })
    : await tx.lessonResource.create({
        data: {
          lessonId: input.lesson.id,
          resourceId: input.resource.id,
          role,
          ...data,
        },
        select: lessonResourceSelect,
      })

  if (isPrimary && approved) {
    await tx.lessonResource.updateMany({
      where: {
        lessonId: input.lesson.id,
        role: 'primary_video',
        id: { not: mapping.id },
      },
      data: { isPrimary: false },
    })
  }

  await tx.auditEvent.create({
    data: {
      actorUserId: input.actorUserId,
      action: approved ? 'youtube_candidate.lesson_resource_approved' : 'youtube_candidate.lesson_resource_drafted',
      entityType: 'LessonResource',
      entityId: mapping.id,
      summary: `Mapped YouTube candidate ${input.item.candidateId} to lesson ${input.lesson.title}`,
      beforeSummary: existing ? `${existing.status}/${existing.verificationStatus}` : null,
      afterSummary: `${mapping.status}/${mapping.verificationStatus}`,
      metadata: JSON.stringify({
        candidateId: input.item.candidateId,
        resourceId: input.resource.id,
        lessonId: input.lesson.id,
        role,
      }),
    },
  })

  return mapping
}

function findCandidate(queue: QueueForPromotion, candidateId: string): QueueReviewItem {
  const item = queue.items.find((candidate) => candidate.candidateId === candidateId)
  if (!item) {
    throw new ApiError('NOT_FOUND', `YouTube candidate ${candidateId} was not found in the review queue.`, 404, false)
  }
  return item
}

function findSubjectMapping(item: QueueReviewItem, subjectCode: string): QueueSubjectMapping {
  const mapping = item.subjectMappings.find((candidateMapping) => candidateMapping.subjectCode === subjectCode)
  if (!mapping) {
    throw new ApiError('NOT_FOUND', `Candidate ${item.candidateId} has no subject mapping for ${subjectCode}.`, 404, false)
  }
  return mapping
}

function assertMappingReady(
  item: QueueReviewItem,
  mapping: QueueSubjectMapping,
  decision: PromoteYouTubeCandidateMappingInput,
) {
  if (mapping.mappingStatus !== 'ready_for_lesson_mapping_review') {
    throw new ApiError('VALIDATION_ERROR', 'This candidate is blocked until verified lesson structure exists.', 400, false)
  }
  if (decision.endSeconds != null && decision.startSeconds != null && decision.endSeconds <= decision.startSeconds) {
    throw new ApiError('VALIDATION_ERROR', 'End time must be after start time.', 400, false)
  }
  if (decision.decision !== 'approve') return
  if (!decision.sourceEvidence) {
    throw new ApiError('VALIDATION_ERROR', 'Reviewer evidence is required before approving a YouTube lesson mapping.', 400, false)
  }
  if (item.resourceKind !== 'video') {
    throw new ApiError('VALIDATION_ERROR', 'Playlist candidates can only be drafted until individual videos are reviewed.', 400, false)
  }
  if (item.metadataStatus !== 'found' || item.embeddable !== true || item.reviewRequired.length > 0) {
    throw new ApiError('VALIDATION_ERROR', 'Only metadata-verified, embeddable YouTube videos can be approved.', 400, false)
  }
}

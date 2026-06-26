import 'server-only'

import { z } from 'zod'
import { db } from '@/lib/db'
import { ApiError } from '@/lib/auth'
import { writeAuditEvent } from '@/lib/authority/audit'

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

export async function listResourceReviewQueue(input: { page?: number; pageSize?: number; status?: string } = {}) {
  const page = Math.max(1, input.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 20))
  const where = input.status
    ? { reviewStatus: input.status }
    : { reviewStatus: { in: ['pending', 'changes_requested'] } }

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
            code: true,
            name: true,
            scheme: { select: { code: true, programmeId: true } },
          },
        },
        _count: { select: { topicMappings: true, reviews: true } },
      },
    }),
  ])

  return { resources, pagination: { total, page, pageSize } }
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

export async function reviewResource(input: z.infer<typeof ReviewResourceSchema>, actorUserId: string) {
  const parsed = ReviewResourceSchema.parse(input)
  const resource = await db.resource.findUnique({
    where: { id: parsed.resourceId },
    select: { id: true, title: true, reviewStatus: true },
  })

  if (!resource) {
    throw new ApiError('NOT_FOUND', 'Resource not found.', 404, false)
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

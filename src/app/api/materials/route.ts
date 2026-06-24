import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requireUser,
  requireModerator,
  withApi,
  okResponse,
  ApiError,
} from '@/lib/auth'
import {
  parseBody,
  createContributionSchema,
  updateContributionSchema,
  moderateContributionSchema,
} from '@/lib/schemas'
import { awardXp } from '@/lib/xp'
import { evaluateAchievements } from '@/lib/achievements'

/**
 * GET /api/materials
 * Public (authenticated) browse of approved/published resources.
 *
 * Query: ?subjectId, ?unitNumber, ?type, ?q (title search), ?mine=true
 *
 * When ?mine=true, returns the current user's contributions (any status) so
 * they can manage their drafts/submissions.
 */
export async function GET(req: NextRequest) {
  return withApi(async () => {
    const user = await requireUser()
    const sp = req.nextUrl.searchParams
    const subjectId = sp.get('subjectId')
    const unitNumber = sp.get('unitNumber')
    const type = sp.get('type')
    const search = sp.get('q')
    const mine = sp.get('mine') === 'true'

    if (mine) {
      // "My Contributions" = the user's draft/submitted/under_review/etc
      // Contributions PLUS any Resource rows that were auto-promoted from
      // their approved Contributions (the moderator-approval flow writes a
      // Resource with contributorId = user.id).
      const [contributions, promotedResources] = await Promise.all([
        db.contribution.findMany({
          where: { userId: user.id },
          orderBy: { updatedAt: 'desc' },
        }),
        db.resource.findMany({
          where: { contributorId: user.id, visibility: 'public' },
          orderBy: { createdAt: 'desc' },
        }),
      ])
      return okResponse({ contributions, promotedResources })
    }

    const where: Record<string, unknown> = { visibility: 'public' }
    if (subjectId) where.subjectId = subjectId
    if (unitNumber) where.unitNumber = parseInt(unitNumber, 10)
    if (type && type !== 'all') where.type = type
    if (search) where.title = { contains: search }

    const resources = await db.resource.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return okResponse(resources)
  })
}

/**
 * POST /api/materials
 * Creates a new contribution in `submitted` status (awaits moderation).
 * XP awarded idempotently for the act of contributing (not for approval —
 * approval can be a separate, larger XP grant if desired).
 */
export async function POST(req: NextRequest) {
  return withApi(async () => {
    const user = await requireUser()
    const body = await parseBody(req, createContributionSchema)

    // Validate subject exists (don't trust the FK error path).
    const subject = await db.subject.findUnique({ where: { id: body.subjectId } })
    if (!subject) {
      throw new ApiError('NOT_FOUND', 'Subject not found.', 404, false)
    }

    // For URL-based types, require fileUrl; for content-based types, require content.
    if (
      (body.type === 'video_link' ||
        body.type === 'web_link' ||
        body.type === 'pdf' ||
        body.type === 'docx' ||
        body.type === 'image' ||
        body.type === 'lab_manual' ||
        body.type === 'question_paper' ||
        body.type === 'model_answer') &&
      !body.fileUrl
    ) {
      throw new ApiError(
        'VALIDATION_ERROR',
        'A file or link URL is required for this material type.',
        400,
        false,
      )
    }
    if ((body.type === 'text' || body.type === 'code') && !body.content) {
      throw new ApiError(
        'VALIDATION_ERROR',
        'Content is required for this material type.',
        400,
        false,
      )
    }

    const contribution = await db.contribution.create({
      data: {
        userId: user.id,
        title: body.title,
        type: body.type,
        subjectId: body.subjectId,
        unitNumber: body.unitNumber,
        topicId: body.topicId,
        content: body.content,
        fileUrl: body.fileUrl,
        status: 'submitted',
      },
    })

    // Award XP via the idempotent ledger, keyed per contribution.
    const xp = await awardXp({
      userId: user.id,
      eventType: 'contribution',
      amount: 5,
      idempotencyKey: `contribution_submit:${contribution.id}`,
      sourceId: contribution.id,
    })

    try {
      await evaluateAchievements({ userId: user.id, trigger: 'contribution' })
    } catch {
      // never break user flow
    }

    // Re-read authoritative total after achievement awards.
    const finalUser = await db.user.findUnique({
      where: { id: user.id },
      select: { xp: true },
    })

    return okResponse({
      ...contribution,
      xpGain: xp.awarded ? xp.amount : 0,
      totalXp: finalUser?.xp ?? 0,
    })
  })
}

/**
 * PATCH /api/materials
 *
 * Two distinct flows (distinguished by the `moderate` flag in the body):
 *
 *  1. STUDENT flow (default): the owner may edit draft content fields
 *     (title, content, fileUrl) and may submit (draft → submitted) or
 *     withdraw (any → archived). They CANNOT set status to approved,
 *     published, under_review, etc. — those are moderator-only transitions.
 *
 *  2. MODERATOR flow (when `moderate: true`): requireModerator() and apply
 *     the moderateContributionSchema (status transitions + moderatorNote).
 *
 * Body for student flow:  { contributionId, title?, content?, fileUrl?, submit?, withdraw? }
 * Body for mod flow:      { contributionId, moderate: true, status, moderatorNote? }
 */
export async function PATCH(req: NextRequest) {
  return withApi(async () => {
    // Peek at body to decide which flow without consuming the stream.
    const cloned = req.clone()
    let rawBody: unknown
    try {
      rawBody = await req.json()
    } catch {
      throw new ApiError('BAD_REQUEST', 'Invalid request body.', 400, false)
    }
    const isModeratorFlow =
      typeof rawBody === 'object' &&
      rawBody !== null &&
      (rawBody as Record<string, unknown>).moderate === true

    if (isModeratorFlow) {
      const mod = await requireModerator()
      const body = await parseBody(cloned, moderateContributionSchema)
      const contributionId = (rawBody as Record<string, unknown>).contributionId
      if (typeof contributionId !== 'string') {
        throw new ApiError('BAD_REQUEST', 'contributionId is required.', 400, false)
      }

      const existing = await db.contribution.findUnique({ where: { id: contributionId } })
      if (!existing) {
        throw new ApiError('NOT_FOUND', 'Contribution not found.', 404, false)
      }

      const updated = await db.contribution.update({
        where: { id: contributionId },
        data: {
          status: body.status,
          moderatorNote: body.moderatorNote,
          reviewerId: mod.id,
        },
      })

      // If approved, also reflect into the public Resource table so it shows
      // up in the browse feed (audit finding: "student self-approve via PATCH").
      if (body.status === 'approved' && existing.subjectId) {
        await db.resource.create({
          data: {
            title: existing.title,
            type: existing.type,
            url: existing.fileUrl,
            content: existing.content,
            subjectId: existing.subjectId,
            unitNumber: existing.unitNumber,
            topicId: existing.topicId,
            source: 'student',
            visibility: 'public',
            verified: true,
            contributorId: existing.userId,
          },
        })
      }

      return okResponse(updated)
    }

    // ---- Student flow ----
    const user = await requireUser()
    const body = await parseBody(cloned, updateContributionSchema)
    const contributionId = (rawBody as Record<string, unknown>).contributionId
    if (typeof contributionId !== 'string') {
      throw new ApiError('BAD_REQUEST', 'contributionId is required.', 400, false)
    }

    // Ownership enforced at the query.
    const existing = await db.contribution.findFirst({
      where: { id: contributionId, userId: user.id },
    })
    if (!existing) {
      throw new ApiError('NOT_FOUND', 'Contribution not found.', 404, false)
    }

    // Only draft/submitted/archived states are student-editable.
    // If already approved/rejected/under_review, only withdraw is allowed.
    const editableStatuses = new Set(['draft', 'submitted', 'archived'])

    const data: Record<string, unknown> = {}

    if (body.title !== undefined) {
      if (!editableStatuses.has(existing.status)) {
        throw new ApiError(
          'CONFLICT',
          'This contribution is past the editable stage — you may only withdraw it.',
          409,
          false,
        )
      }
      data.title = body.title
    }
    if (body.content !== undefined) {
      if (!editableStatuses.has(existing.status)) {
        throw new ApiError(
          'CONFLICT',
          'This contribution is past the editable stage — you may only withdraw it.',
          409,
          false,
        )
      }
      data.content = body.content
    }
    if (body.fileUrl !== undefined) {
      if (!editableStatuses.has(existing.status)) {
        throw new ApiError(
          'CONFLICT',
          'This contribution is past the editable stage — you may only withdraw it.',
          409,
          false,
        )
      }
      data.fileUrl = body.fileUrl
    }
    if (body.submit === true) {
      if (existing.status !== 'draft' && existing.status !== 'archived') {
        throw new ApiError(
          'CONFLICT',
          'Only draft or withdrawn contributions can be submitted.',
          409,
          false,
        )
      }
      data.status = 'submitted'
    }
    if (body.withdraw === true) {
      data.status = 'archived'
    }

    if (Object.keys(data).length === 0) {
      return okResponse(existing)
    }

    const updated = await db.contribution.update({
      where: { id: contributionId },
      data,
    })
    return okResponse(updated)
  })
}

import { NextRequest } from 'next/server'
import { requireUser, withApi, okResponse, ApiError } from '@/lib/auth'
import { db } from '@/lib/db'
import { checkRateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const REPORT_THRESHOLD = 3

const reportSchema = z.object({
  postId: z.string().optional(),
  commentId: z.string().optional(),
  reason: z.string().trim().min(1).max(500),
})

export async function POST(req: NextRequest) {
  return withApi(async () => {
    const user = await requireUser()
    const body = await req.json().catch(() => ({}))
    const parsed = reportSchema.safeParse(body)
    if (!parsed.success) throw new ApiError('BAD_REQUEST', JSON.stringify(parsed.error.flatten()), 400, true)
    if (!parsed.data.postId && !parsed.data.commentId) {
      throw new ApiError('BAD_REQUEST', 'postId or commentId required', 400, true)
    }

    const limiter = await checkRateLimit({
      action: 'community_report',
      identifier: user.id,
      limit: 10,
      windowMs: 60 * 60 * 1000,
    })
    if (!limiter.allowed) {
      throw new ApiError('RATE_LIMITED', `Too many reports. Try again in ${limiter.retryAfterSec}s.`, 429, true)
    }

    // Create the report record
    await db.communityReport.create({
      data: {
        reporterId: user.id,
        reason: parsed.data.reason,
        postId: parsed.data.postId,
        commentId: parsed.data.commentId,
      },
    })

    // Increment reports count and auto-hide if threshold reached
    if (parsed.data.postId) {
      const post = await db.communityPost.update({
        where: { id: parsed.data.postId },
        data: { reports: { increment: 1 } },
      })
      if (post.reports >= REPORT_THRESHOLD && post.status === 'published') {
        await db.communityPost.update({
          where: { id: parsed.data.postId },
          data: { status: 'hidden' },
        })
      }
    } else if (parsed.data.commentId) {
      const comment = await db.communityComment.update({
        where: { id: parsed.data.commentId },
        data: { reports: { increment: 1 } },
      })
      if (comment.reports >= REPORT_THRESHOLD && comment.status === 'published') {
        await db.communityComment.update({
          where: { id: parsed.data.commentId },
          data: { status: 'hidden' },
        })
      }
    }

    return okResponse({ reported: true })
  })
}

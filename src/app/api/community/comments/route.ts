import { NextRequest } from 'next/server'
import { requireUser, withApi, okResponse, ApiError } from '@/lib/auth'
import { db } from '@/lib/db'
import { checkRateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const createCommentSchema = z.object({
  postId: z.string(),
  body: z.string().trim().min(1).max(3000),
})

export async function GET(req: NextRequest) {
  return withApi(async () => {
    const user = await requireUser()
    const { searchParams } = new URL(req.url)
    const postId = searchParams.get('postId')
    if (!postId) throw new ApiError('BAD_REQUEST', 'postId required', 400, true)

    const comments = await db.communityComment.findMany({
      where: { postId, status: 'published' },
      include: {
        author: { select: { name: true, departmentCode: true, semesterNumber: true } },
        votes: { where: { userId: user.id }, select: { id: true } },
      },
      orderBy: [{ isBestAnswer: 'desc' }, { upvotes: 'desc' }, { createdAt: 'asc' }],
    })

    return okResponse({
      comments: comments.map(c => ({
        id: c.id,
        authorName: c.author.name,
        authorDept: c.author.departmentCode ?? '—',
        authorSemester: c.author.semesterNumber ?? 0,
        body: c.body,
        upvotes: c.upvotes,
        isBestAnswer: c.isBestAnswer,
        hasVoted: c.votes.length > 0,
        createdAt: c.createdAt.toISOString(),
      })),
    })
  })
}

export async function POST(req: NextRequest) {
  return withApi(async () => {
    const user = await requireUser()
    const body = await req.json().catch(() => ({}))
    const parsed = createCommentSchema.safeParse(body)
    if (!parsed.success) {
      throw new ApiError('BAD_REQUEST', JSON.stringify(parsed.error.flatten()), 400, true)
    }

    const limiter = await checkRateLimit({
      action: 'community_comment',
      identifier: user.id,
      limit: 30,
      windowMs: 60 * 60 * 1000, // 30 comments/hour
    })
    if (!limiter.allowed) {
      throw new ApiError('RATE_LIMITED', `Too many comments. Try again in ${limiter.retryAfterSec}s.`, 429, true)
    }

    const comment = await db.communityComment.create({
      data: {
        postId: parsed.data.postId,
        authorId: user.id,
        body: parsed.data.body,
        status: 'published',
      },
    })

    return okResponse({ comment })
  })
}

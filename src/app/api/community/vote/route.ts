import { NextRequest } from 'next/server'
import { requireUser, withApi, okResponse, ApiError } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const voteSchema = z.object({ commentId: z.string() })

export async function POST(req: NextRequest) {
  return withApi(async () => {
    const user = await requireUser()
    const body = await req.json().catch(() => ({}))
    const parsed = voteSchema.safeParse(body)
    if (!parsed.success) throw new ApiError('BAD_REQUEST', 'commentId required', 400, true)

    // Check if already voted
    const existing = await db.communityVote.findUnique({
      where: { userId_commentId: { userId: user.id, commentId: parsed.data.commentId } },
    })

    if (existing) {
      // Toggle off (remove vote)
      await db.communityVote.delete({ where: { id: existing.id } })
      await db.communityComment.update({
        where: { id: parsed.data.commentId },
        data: { upvotes: { decrement: 1 } },
      })
      return okResponse({ voted: false })
    }

    // Add vote
    await db.communityVote.create({
      data: { userId: user.id, commentId: parsed.data.commentId, value: 1 },
    })
    await db.communityComment.update({
      where: { id: parsed.data.commentId },
      data: { upvotes: { increment: 1 } },
    })

    return okResponse({ voted: true })
  })
}

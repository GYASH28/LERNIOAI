import { NextRequest } from 'next/server'
import { requireRole, withApi, okResponse, ApiError } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const moderateSchema = z.object({
  postId: z.string(),
  action: z.enum(['approve', 'remove']),
})

export async function POST(req: NextRequest) {
  return withApi(async () => {
    const user = await requireRole('moderator', 'admin')
    const body = await req.json().catch(() => ({}))
    const parsed = moderateSchema.safeParse(body)
    if (!parsed.success) throw new ApiError('BAD_REQUEST', JSON.stringify(parsed.error.flatten()), 400, true)

    const newStatus = parsed.data.action === 'approve' ? 'published' : 'removed'
    await db.communityPost.update({
      where: { id: parsed.data.postId },
      data: {
        status: newStatus,
        reviewerId: user.id,
        moderatorNote: parsed.data.action === 'approve' ? 'Approved by moderator' : 'Removed by moderator',
      },
    })

    return okResponse({ moderated: true, newStatus })
  })
}

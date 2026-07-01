import { z } from 'zod'
import { db } from '@/lib/db'
import { getCurrentUser, withApi, okResponse, ApiError } from '@/lib/auth'
import { parseBody } from '@/lib/schemas'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const createFeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  type: z.enum(['bug', 'idea', 'praise', 'question']),
  description: z.string().min(1).max(5000),
  screenshot: z.string().optional(),
  pageUrl: z.string().optional(),
})

export function GET() {
  return withApi(async () => {
    const user = await getCurrentUser()
    // Only admins can see all feedback; students see their own
    if (user.role === 'admin') {
      const feedback = await db.feedback.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
      })
      return okResponse(feedback)
    }
    const feedback = await db.feedback.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })
    return okResponse(feedback)
  })
}

export function POST(request: Request) {
  return withApi(async () => {
    const user = await getCurrentUser()
    const body = await parseBody(request, createFeedbackSchema)

    const feedback = await db.feedback.create({
      data: {
        userId: user.id,
        rating: body.rating,
        type: body.type,
        description: body.description,
        screenshot: body.screenshot ?? null,
        pageUrl: body.pageUrl ?? null,
        userAgent: request.headers.get('user-agent') ?? null,
      },
    })
    return okResponse(feedback)
  })
}

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, withApi, okResponse, parseBody } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const GET = withApi(async () => {
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

export const POST = withApi(async (req: NextRequest) => {
  const user = await getCurrentUser()
  const body = await parseBody(req, {
    rating: 'number',
    type: 'string',
    description: 'string',
    screenshot: 'string?',
    pageUrl: 'string?',
  })

  if (body.rating < 1 || body.rating > 5) {
    throw new Error('Rating must be between 1 and 5')
  }

  const feedback = await db.feedback.create({
    data: {
      userId: user.id,
      rating: body.rating,
      type: body.type,
      description: body.description,
      screenshot: body.screenshot ?? null,
      pageUrl: body.pageUrl ?? null,
      userAgent: req.headers.get('user-agent') ?? null,
    },
  })
  return okResponse(feedback, 201)
})

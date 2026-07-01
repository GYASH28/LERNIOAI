import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, withApi, okResponse, ApiError, parseBody } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const GET = withApi(async () => {
  const user = await getCurrentUser()
  const bookmarks = await db.bookmark.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })
  return okResponse(bookmarks)
})

export const POST = withApi(async (req: NextRequest) => {
  const user = await getCurrentUser()
  const body = await parseBody(req, {
    resourceType: 'string',
    resourceId: 'string',
    label: 'string?',
  })
  const bookmark = await db.bookmark.upsert({
    where: {
      userId_resourceType_resourceId: {
        userId: user.id,
        resourceType: body.resourceType,
        resourceId: body.resourceId,
      },
    },
    create: {
      userId: user.id,
      resourceType: body.resourceType,
      resourceId: body.resourceId,
      label: body.label ?? null,
    },
    update: {
      label: body.label ?? null,
    },
  })
  return okResponse(bookmark, 201)
})

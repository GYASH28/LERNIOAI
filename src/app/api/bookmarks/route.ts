import { z } from 'zod'
import { db } from '@/lib/db'
import { getCurrentUser, withApi, okResponse } from '@/lib/auth'
import { parseBody } from '@/lib/schemas'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const createBookmarkSchema = z.object({
  resourceType: z.string().min(1),
  resourceId: z.string().min(1),
  label: z.string().optional(),
})

export function GET() {
  return withApi(async () => {
    const user = await getCurrentUser()
    const bookmarks = await db.bookmark.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })
    return okResponse(bookmarks)
  })
}

export function POST(request: Request) {
  return withApi(async () => {
    const user = await getCurrentUser()
    const body = await parseBody(request, createBookmarkSchema)
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
    return okResponse(bookmark)
  })
}

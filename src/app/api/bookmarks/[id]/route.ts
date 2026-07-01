import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, withApi, okResponse, ApiError } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const DELETE = withApi(async (req: NextRequest) => {
  const user = await getCurrentUser()
  const { pathname } = new URL(req.url)
  const id = pathname.split('/').pop()!
  const bookmark = await db.bookmark.findUnique({ where: { id } })
  if (!bookmark || bookmark.userId !== user.id) {
    throw new ApiError('NOT_FOUND', 'Bookmark not found.', 404, false)
  }
  await db.bookmark.delete({ where: { id } })
  return okResponse({ deleted: true })
})

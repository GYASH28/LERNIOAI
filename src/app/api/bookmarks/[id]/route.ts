import { db } from '@/lib/db'
import { requireUser, withApi, okResponse, ApiError } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export function DELETE(request: Request) {
  return withApi(async () => {
    const user = await requireUser()
    const { pathname } = new URL(request.url)
    const id = pathname.split('/').pop()!
    const bookmark = await db.bookmark.findUnique({ where: { id } })
    if (!bookmark || bookmark.userId !== user.id) {
      throw new ApiError('NOT_FOUND', 'Bookmark not found.', 404, false)
    }
    await db.bookmark.delete({ where: { id } })
    return okResponse({ deleted: true })
  })
}

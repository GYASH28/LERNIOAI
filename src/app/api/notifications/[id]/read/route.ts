import { db } from '@/lib/db'
import { requireUser, withApi, okResponse, ApiError } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export function POST(request: Request) {
  return withApi(async () => {
    const user = await requireUser()
    const { pathname } = new URL(request.url)
    const id = pathname.split('/').slice(-2, -1)[0]!
    const notification = await db.notification.findUnique({ where: { id } })
    if (!notification || notification.userId !== user.id) {
      throw new ApiError('NOT_FOUND', 'Notification not found.', 404, false)
    }
    await db.notification.update({
      where: { id },
      data: { readAt: new Date() },
    })
    return okResponse({ read: true })
  })
}

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, withApi, okResponse, ApiError } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const POST = withApi(async (req: NextRequest) => {
  const user = await getCurrentUser()
  const { pathname } = new URL(req.url)
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

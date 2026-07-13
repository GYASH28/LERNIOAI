import { db } from '@/lib/db'
import { requireUser, withApi, okResponse } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export function POST() {
  return withApi(async () => {
    const user = await requireUser()
    await db.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    })
    return okResponse({ markedAllRead: true })
  })
}

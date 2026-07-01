import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, withApi, okResponse } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const GET = withApi(async (req: NextRequest) => {
  const user = await getCurrentUser()
  const url = new URL(req.url)
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '20'), 100)

  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  const unreadCount = await db.notification.count({
    where: { userId: user.id, readAt: null },
  })

  return okResponse({ notifications, unreadCount })
})

import { db } from '@/lib/db'
import { okResponse, requireActiveRole, withApi } from '@/lib/auth'

export async function GET(request: Request) {
  return withApi(async () => {
    await requireActiveRole('admin')
    const url = new URL(request.url)
    const take = Math.min(100, Math.max(1, Number(url.searchParams.get('take') || 50)))
    const events = await db.auditEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        summary: true,
        metadata: true,
        createdAt: true,
        actorUser: { select: { id: true, name: true, email: true } },
        targetUser: { select: { id: true, name: true, email: true } },
      },
    })
    return okResponse({ events })
  })
}

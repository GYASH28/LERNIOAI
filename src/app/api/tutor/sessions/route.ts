import { NextRequest } from 'next/server'
import { requireUser, withApi, okResponse } from '@/lib/auth'
import { listSessions } from '@/lib/ai/memory/manager'

export const runtime = 'nodejs'

/** Lists the current user's tutor sessions via the memory manager. */
export async function GET(req: NextRequest) {
  return withApi(async () => {
    const user = await requireUser()
    const url = new URL(req.url)
    const includeArchived = url.searchParams.get('archived') === 'true'
    const sessions = await listSessions(user.id, { includeArchived })
    return okResponse({ sessions })
  })
}

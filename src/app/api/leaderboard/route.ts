import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, withApi, okResponse, ApiError } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export function GET(request: NextRequest) {
  return withApi(async () => {
    const user = await getCurrentUser()
    if (!user) throw new ApiError('UNAUTHENTICATED', 'Sign in required', 401, false)
    const users = await db.user.findMany({
      where: { role: 'student', status: 'active' },
      select: { id: true, name: true, xp: true, streak: true, avatar: true },
      orderBy: [{ xp: 'desc' }], take: 50,
    })
    const ranked = users.map((u, i) => ({ rank: i+1, id: u.id, name: u.id === user.id ? u.name+' (You)' : u.name, xp: u.xp, streak: u.streak, avatar: u.avatar, isYou: u.id === user.id }))
    return okResponse({ leaderboard: ranked, myRank: ranked.find(r => r.isYou)?.rank ?? 'N/A', total: users.length })
  })
}

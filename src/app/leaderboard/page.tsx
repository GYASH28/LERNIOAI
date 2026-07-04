import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { Trophy } from 'lucide-react'
import { LeaderboardClient } from './leaderboard-client'

export const dynamic = 'force-dynamic'

export default async function LeaderboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/leaderboard')
  const users = await db.user.findMany({ where: { role: 'student', status: 'active' }, select: { id: true, name: true, xp: true, streak: true, avatar: true }, orderBy: [{ xp: 'desc' }], take: 50 })
  const ranked = users.map((u, i) => ({ rank: i+1, id: u.id, name: u.id === user.id ? u.name+' (You)' : u.name, xp: u.xp, streak: u.streak, avatar: u.avatar, isYou: u.id === user.id }))
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-5 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10"><Trophy className="h-6 w-6 text-amber-600" /></div>
          <div><h1 className="text-2xl font-bold">Leaderboard</h1><p className="text-sm text-muted-foreground">Top students by XP</p></div>
        </div>
        <LeaderboardClient initialData={ranked} currentUserId={user.id} />
      </div>
    </main>
  )
}

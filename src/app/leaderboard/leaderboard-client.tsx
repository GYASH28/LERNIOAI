'use client'
import { Zap, Flame, Crown } from 'lucide-react'

interface RankedUser { rank: number; id: string; name: string; xp: number; streak: number; avatar: string | null; isYou: boolean }

export function LeaderboardClient({ initialData, currentUserId }: { initialData: RankedUser[]; currentUserId: string }) {
  const medals = ['🥇','🥈','🥉']
  const podiumColors = ['from-yellow-400 to-amber-600', 'from-gray-300 to-gray-500', 'from-orange-400 to-amber-700']
  const podiumHeights = ['h-28', 'h-20', 'h-16']

  const top3 = initialData.slice(0, 3)
  const rest = initialData.slice(3)

  return (
    <div className="space-y-6">
      {/* Podium for top 3 */}
      {top3.length > 0 && (
        <div className="flex items-end justify-center gap-2 sm:gap-4">
          {/* Reorder: 2nd, 1st, 3rd */}
          {[1, 0, 2].map((idx) => {
            const u = top3[idx]
            if (!u) return <div key={idx} className="flex-1 max-w-[120px]" />
            const rank = idx + 1
            return (
              <div key={u.id} className={`flex flex-1 max-w-[120px] flex-col items-center`}>
                {/* Avatar */}
                <div className={`relative mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary ${u.isYou ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}>
                  {u.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
                  {rank === 1 && <Crown className="absolute -top-3 left-1/2 -translate-x-1/2 h-5 w-5 text-amber-500" />}
                </div>
                {/* Name */}
                <p className="truncate text-xs font-semibold w-full text-center">{u.isYou ? 'You' : u.name.split(' ')[0]}</p>
                {/* XP */}
                <p className="text-[10px] text-amber-500 font-bold">{u.xp} XP</p>
                {/* Pedestal */}
                <div className={`mt-2 flex w-full ${podiumHeights[idx]} items-start justify-center rounded-t-lg bg-gradient-to-b ${podiumColors[idx]} pt-2`}>
                  <span className="text-2xl">{medals[idx]}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Rest of the leaderboard */}
      {rest.length > 0 && (
        <div className="space-y-2">
          {rest.map(u => (
            <div key={u.id} className={`flex items-center gap-3 rounded-lg border p-3 sm:p-4 transition-colors card-lift ${u.isYou ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-accent/5'}`}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center text-sm font-bold text-muted-foreground">#{u.rank}</div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {u.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {u.name}
                  {u.isYou && <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">YOU</span>}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1 rounded bg-amber-500/10 px-2 py-1 font-bold text-amber-600"><Zap className="h-3 w-3" />{u.xp}</span>
                <span className="flex items-center gap-1 rounded bg-orange-500/10 px-2 py-1 font-bold text-orange-600"><Flame className="h-3 w-3" />{u.streak}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {initialData.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 text-5xl">🏆</div>
          <p className="text-base font-semibold">Be the first to earn XP!</p>
          <p className="text-sm text-muted-foreground">Start learning to climb the ranks.</p>
        </div>
      )}
    </div>
  )
}

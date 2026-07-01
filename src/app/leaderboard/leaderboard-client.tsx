'use client'
import { Zap, Flame } from 'lucide-react'

interface RankedUser { rank: number; id: string; name: string; xp: number; streak: number; avatar: string | null; isYou: boolean }

export function LeaderboardClient({ initialData }: { initialData: RankedUser[]; currentUserId: string }) {
  const medals = ['🥇','🥈','🥉']
  return (
    <div className="space-y-2">
      {initialData.map(u => (
        <div key={u.id} className={`flex items-center gap-3 rounded-lg border p-3 sm:p-4 transition-colors ${u.isYou ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-accent/5'}`}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center text-lg font-bold">{u.rank <= 3 ? medals[u.rank-1] : <span className="text-sm text-muted-foreground">#{u.rank}</span>}</div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{u.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}</div>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{u.name}</p></div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 rounded bg-amber-500/10 px-2 py-1 font-bold text-amber-600"><Zap className="h-3 w-3" />{u.xp}</span>
            <span className="flex items-center gap-1 rounded bg-orange-500/10 px-2 py-1 font-bold text-orange-600"><Flame className="h-3 w-3" />{u.streak}</span>
          </div>
        </div>
      ))}
      {initialData.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">No students yet. Be the first!</p>}
    </div>
  )
}

import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { Trophy, Lock, Star } from 'lucide-react'
import { TopBar } from '@/components/layout/top-bar'
import { Footer } from '@/components/layout/footer'

export const dynamic = 'force-dynamic'

export default async function AchievementsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/achievements')

  const achievements = await db.achievement.findMany({
    orderBy: { xpReward: 'desc' },
  })
  const userAchievements = await db.userAchievement.findMany({
    where: { userId: user.id },
    select: { achievementId: true, earnedAt: true },
  })
  const earnedMap = new Map(userAchievements.map((ua) => [ua.achievementId, ua.earnedAt]))

  const earnedCount = userAchievements.length
  const totalXp = achievements.reduce((sum, a) => sum + a.xpReward, 0)
  const earnedXp = achievements
    .filter((a) => earnedMap.has(a.id))
    .reduce((sum, a) => sum + a.xpReward, 0)

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <TopBar />
      <main className="flex-1 page-wipe bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10">
            <Trophy className="h-7 w-7 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Achievements</h1>
            <p className="text-sm text-muted-foreground">
              {earnedCount} of {achievements.length} unlocked · {earnedXp} / {totalXp} XP earned
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all"
            style={{ width: `${achievements.length > 0 ? (earnedCount / achievements.length) * 100 : 0}%` }}
          />
        </div>

        {/* Achievement grid */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {achievements.map((achievement) => {
            const earnedAt = earnedMap.get(achievement.id)
            const isEarned = !!earnedAt
            return (
              <div
                key={achievement.id}
                className={`rounded-lg border p-4 transition-colors ${
                  isEarned
                    ? 'border-amber-500/30 bg-amber-500/5'
                    : 'border-border bg-card opacity-75'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      isEarned ? 'bg-amber-500/10' : 'bg-muted'
                    }`}
                  >
                    {isEarned ? (
                      <Star className="h-5 w-5 fill-amber-500 text-amber-500" />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{achievement.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{achievement.description}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">
                        +{achievement.xpReward} XP
                      </span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] capitalize text-muted-foreground">
                        {achievement.category}
                      </span>
                    </div>
                    {isEarned && earnedAt && (
                      <p className="mt-1 text-[10px] text-muted-foreground/60">
                        Earned {new Date(earnedAt).toLocaleDateString('en-IN')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {achievements.length === 0 && (
          <div className="mt-8 rounded-lg border border-dashed border-border py-16 text-center">
            <Trophy className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">No achievements defined yet.</p>
          </div>
        )}
      </div>
    </main>
      <Footer />
    </div>
  )
}

import { db } from '@/lib/db'
import { requireUser, withApi, okResponse } from '@/lib/auth'
import { DEMO_ACHIEVEMENTS, isDemoMode } from '@/lib/demo-fixtures'

/**
 * GET /api/achievements
 * READ-ONLY. Returns the achievement catalogue plus the user's earned
 * UserAchievements. NEVER awards XP or creates rows during a GET —
 * achievement evaluation is triggered by the routes that cause events
 * (progress POST, exams POST, lesson POST, revision POST, coding POST).
 */
export async function GET() {
  return withApi(async () => {
    if (isDemoMode()) return okResponse(DEMO_ACHIEVEMENTS)

    const user = await requireUser()

    const [achievements, earned] = await Promise.all([
      db.achievement.findMany({ orderBy: { category: 'asc' } }),
      db.userAchievement.findMany({
        where: { userId: user.id },
        include: { achievement: true },
        orderBy: { earnedAt: 'desc' },
      }),
    ])

    const earnedIds = new Set(earned.map((e) => e.achievementId))

    return okResponse({
      achievements: achievements.map((a) => ({
        ...a,
        earned: earnedIds.has(a.id),
      })),
      earned,
      // Kept for backwards-compat with existing frontend code; always empty
      // now because GET is read-only — achievements are evaluated by the
      // routes that cause events (progress POST, exams POST, etc.).
      newlyEarned: [],
    })
  })
}

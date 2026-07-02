import { db } from '@/lib/db'
import { requireUser, withApi, okResponse } from '@/lib/auth'
import { isDemoMode } from '@/lib/demo-fixtures'

/**
 * GET /api/achievements/new?since=ISO-DATE
 *
 * Returns UserAchievements earned AFTER the `since` timestamp. Used by the
 * AchievementUnlockToaster component to surface celebratory toasts for
 * achievements that were unlocked server-side (e.g. by a focus session, a
 * streak-freeze use, or a daily-quest claim) while the user was on another
 * view.
 *
 * Polling strategy (client-side):
 *   - On mount: GET with `since` = (now - 5s) — catches unlocks that happened
 *     just before the toaster loaded.
 *   - On every poll (default 15s): GET with `since` = last poll time.
 *   - On toast dismiss: the client advances its `since` past the earnedAt of
 *     the dismissed achievement so it doesn't re-show on the next poll.
 *
 * Response:
 *   {
 *     newlyEarned: Array<{
 *       id, achievementId, earnedAt: ISO,
 *       achievement: { id, key, name, description, icon, category, xpReward }
 *     }>,
 *     serverTime: ISO  // current server time — use as the next `since`
 *   }
 *
 * Notes:
 *   - Caps at 10 results to avoid a toast storm if the user was offline.
 *   - Read-only — never creates UserAchievements during a GET.
 */
export async function GET(req: Request) {
  return withApi(async () => {
    if (isDemoMode()) {
      return okResponse({ newlyEarned: [], serverTime: new Date().toISOString() })
    }

    const user = await requireUser()
    const url = new URL(req.url)
    const sinceParam = url.searchParams.get('since')

    // Default: 30s ago — catches unlocks that happened just before the toaster
    // loaded, but doesn't dump a backlog of every achievement the user ever
    // earned on first mount.
    let since: Date
    if (sinceParam) {
      const d = new Date(sinceParam)
      since = Number.isNaN(d.getTime()) ? new Date(Date.now() - 30_000) : d
    } else {
      since = new Date(Date.now() - 30_000)
    }

    const newlyEarned = await db.userAchievement.findMany({
      where: {
        userId: user.id,
        earnedAt: { gt: since },
      },
      include: {
        achievement: {
          select: {
            id: true,
            key: true,
            name: true,
            description: true,
            icon: true,
            category: true,
            xpReward: true,
          },
        },
      },
      orderBy: { earnedAt: 'asc' },
      take: 10,
    })

    return okResponse({
      newlyEarned: newlyEarned.map((ua) => ({
        id: ua.id,
        achievementId: ua.achievementId,
        earnedAt: ua.earnedAt.toISOString(),
        achievement: ua.achievement,
      })),
      serverTime: new Date().toISOString(),
    })
  })
}

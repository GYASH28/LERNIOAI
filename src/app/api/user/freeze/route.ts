import { NextResponse } from 'next/server'
import { requireUser, withApi, ApiError, okResponse } from '@/lib/auth'
import { db } from '@/lib/db'
import { awardXp } from '@/lib/xp'
import { evaluateAchievements } from '@/lib/achievements'
import { z } from 'zod'
import { DEMO_FREEZE_STATUS, isDemoMode } from '@/lib/demo-fixtures'

/**
 * Streak Freeze system — earn a freeze by completing all 5 daily quests,
 * spend a freeze to keep your streak on a missed day.
 *
 * GET /api/user/freeze
 *   Returns: { freezes, maxFreezes, lastActiveDate, lastFreezeUsedDate,
 *              streakBroken, canUseFreeze }
 *
 * POST /api/user/freeze
 *   Body: { action: 'use' }
 *   Effect: decrements streakFreezes by 1, sets lastFreezeUsedDate=today,
 *           preserves user.streak at its current value (does NOT advance it).
 *           Idempotent per day — using twice on the same calendar day is a
 *           no-op (returns current state).
 *
 * Rules:
 *   - Max 5 freezes stored at any time (capped at write-time).
 *   - Can only use a freeze when streakBroken is true (i.e. today's streak
 *     counter is 0 because the previous day had no activity).
 *   - Freezes are earned via /api/analytics/quests/claim when all 5 quests
 *     are complete — not here.
 */

const MAX_FREEZES = 5

export async function GET() {
  return withApi(async () => {
    if (isDemoMode()) return okResponse(DEMO_FREEZE_STATUS)

    const authUser = await requireUser()
    const user = await db.user.findUnique({
      where: { id: authUser.id },
      select: {
        streak: true,
        streakFreezes: true,
        lastActiveDate: true,
        lastFreezeUsedDate: true,
      },
    })
    if (!user) throw new ApiError('NOT_FOUND', 'User not found.', 404, false)

    const today = new Date().toISOString().slice(0, 10)
    // Streak is considered "broken" if lastActiveDate is older than yesterday
    // AND today has no activity yet — i.e. the streak counter will reset to 0
    // on the next activity. We let the client show a "Use Freeze" button then.
    let streakBroken = false
    if (user.lastActiveDate) {
      const last = new Date(user.lastActiveDate)
      const todayDate = new Date(today + 'T00:00:00Z')
      const diffDays = Math.round(
        (todayDate.getTime() - last.getTime()) / (1000 * 60 * 60 * 24),
      )
      // >1 day gap = streak already broken (would reset on next activity)
      streakBroken = diffDays > 1
    }
    const alreadyUsedToday = user.lastFreezeUsedDate === today

    return okResponse({
      freezes: user.streakFreezes,
      maxFreezes: MAX_FREEZES,
      lastActiveDate: user.lastActiveDate,
      lastFreezeUsedDate: user.lastFreezeUsedDate,
      streak: user.streak,
      streakBroken,
      canUseFreeze: streakBroken && user.streakFreezes > 0 && !alreadyUsedToday,
      alreadyUsedToday,
    })
  })
}

const PostSchema = z.object({
  action: z.enum(['use']),
})

export async function POST(req: Request) {
  return withApi(async () => {
    if (isDemoMode()) {
      await req.json().catch(() => ({}))
      return okResponse({ used: false, reason: 'demo_mode', ...DEMO_FREEZE_STATUS })
    }

    const authUser = await requireUser()
    const json = await req.json().catch(() => ({}))
    const parsed = PostSchema.safeParse(json)
    if (!parsed.success) {
      throw new ApiError('BAD_REQUEST', 'Invalid action.', 400, false)
    }

    const user = await db.user.findUnique({
      where: { id: authUser.id },
      select: {
        streak: true,
        streakFreezes: true,
        lastActiveDate: true,
        lastFreezeUsedDate: true,
      },
    })
    if (!user) throw new ApiError('NOT_FOUND', 'User not found.', 404, false)

    const today = new Date().toISOString().slice(0, 10)

    // Idempotent: if already used today, return current state.
    if (user.lastFreezeUsedDate === today) {
      return okResponse({
        used: false,
        reason: 'already_used_today',
        freezes: user.streakFreezes,
        streak: user.streak,
      })
    }

    if (user.streakFreezes <= 0) {
      throw new ApiError(
        'NO_FREEZES',
        'You have no streak freezes. Complete all 5 daily quests to earn one!',
        400,
        false,
      )
    }

    // Compute whether streak is actually broken.
    let streakBroken = false
    if (user.lastActiveDate) {
      const last = new Date(user.lastActiveDate)
      const todayDate = new Date(today + 'T00:00:00Z')
      const diffDays = Math.round(
        (todayDate.getTime() - last.getTime()) / (1000 * 60 * 60 * 24),
      )
      streakBroken = diffDays > 1
    }
    if (!streakBroken) {
      throw new ApiError(
        'STREAK_NOT_BROKEN',
        'Your streak is still active — no freeze needed.',
        400,
        false,
      )
    }

    // Apply the freeze: consume 1 freeze, mark today as used, and bridge
    // lastActiveDate forward to "yesterday" so the next activity continues
    // the streak naturally.
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    await db.user.update({
      where: { id: authUser.id },
      data: {
        streakFreezes: { decrement: 1 },
        lastFreezeUsedDate: today,
        lastActiveDate: yesterday.toISOString().slice(0, 10),
      },
    })

    // Bonus XP for protecting the streak (idempotent per use-day).
    await awardXp({
      userId: authUser.id,
      eventType: 'streak',
      amount: 15,
      idempotencyKey: `streak_freeze:${authUser.id}:${today}`,
    })

    // Evaluate freeze-related achievements (freeze_first, xp_*)
    const newlyUnlocked = await evaluateAchievements({
      userId: authUser.id,
      trigger: 'streak_freeze',
    })

    return okResponse({
      used: true,
      freezes: user.streakFreezes - 1,
      streak: user.streak,
      newlyUnlocked,
    })
  })
}

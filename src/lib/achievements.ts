/**
 * Achievement evaluator — triggered AFTER verified events, never during a GET.
 *
 * Each achievement has a criteria check. If met and not already awarded,
 * create UserAchievement + award XP via the ledger (idempotent).
 *
 * Returns the list of NEWLY-unlocked achievements so callers can surface them
 * to the client (e.g. via a celebratory toast, or by stamping a "newlyEarned"
 * field on the response that the achievement toaster polls for).
 */
import 'server-only'
import { db } from '@/lib/db'
import { awardXp } from '@/lib/xp'

interface AchievementContext {
  userId: string
  trigger:
    | 'lesson_complete'
    | 'question_correct'
    | 'quiz_submit'
    | 'revision'
    | 'coding_pass'
    | 'contribution'
    | 'login'
    | 'focus_session'
    | 'voice_input'
    | 'streak_freeze'
    | 'daily_quest_bonus'
}

export interface UnlockedAchievement {
  id: string
  key: string
  name: string
  description: string
  icon: string
  category: string
  xpReward: number
  earnedAt: string
}

/**
 * Evaluate all achievements for a user against current state.
 * Idempotent — only awards achievements not yet earned.
 *
 * Returns the list of achievements that were unlocked by THIS evaluation pass
 * (i.e. newly-earned since the last call). Callers can use this to fire
 * celebratory toasts or push notifications.
 */
export async function evaluateAchievements(
  ctx: AchievementContext,
): Promise<UnlockedAchievement[]> {
  const { userId } = ctx
  const unlocked: UnlockedAchievement[] = []

  const [
    user,
    lessonCount,
    correctCount,
    quizCount,
    revisionCount,
    codingCount,
    contribCount,
    focusCount,
    focusMins,
    voiceCount,
    freezeCount,
    questBonusCount,
    achievements,
  ] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { streak: true, xp: true } }),
    db.lessonCompletion.count({ where: { userId, completedAt: { not: null } } }),
    db.questionAttempt.count({ where: { userId, isCorrect: true } }),
    db.quizAttempt.count({ where: { userId, completedAt: { not: null } } }),
    db.revisionAttempt.count({ where: { userId } }),
    db.codingSubmission.count({ where: { userId, status: 'passed' } }),
    db.contribution.count({ where: { userId, status: 'approved' } }),
    db.studySession.count({ where: { userId } }),
    db.studySession.aggregate({ where: { userId }, _sum: { durationMins: true } }),
    db.xpEvent.count({ where: { userId, eventType: 'lesson_complete' } }), // voice proxy until dedicated event
    db.xpEvent.count({ where: { userId, eventType: 'streak_freeze' } }),
    db.xpEvent.count({ where: { userId, eventType: 'daily_quest_bonus' } }),
    db.achievement.findMany(),
  ])

  if (!user) return unlocked
  const earned = await db.userAchievement.findMany({ where: { userId }, select: { achievementId: true } })
  const earnedIds = new Set(earned.map((e) => e.achievementId))

  for (const a of achievements) {
    if (earnedIds.has(a.id)) continue
    const met = checkCriteria(a.key, {
      lessonCount,
      correctCount,
      quizCount,
      revisionCount,
      codingCount,
      contribCount,
      streak: user.streak,
      xp: user.xp,
      focusCount,
      focusMins: focusMins._sum.durationMins ?? 0,
      voiceCount,
      freezeCount,
      questBonusCount,
    })
    if (met) {
      const ua = await db.userAchievement.create({ data: { userId, achievementId: a.id } }).catch(() => null)
      // .catch handles the rare race where two concurrent evaluations both pass
      // the earnedIds check — the second create throws a unique-constraint error
      // and we just skip it.
      if (ua) {
        await awardXp({
          userId,
          eventType: 'achievement',
          amount: a.xpReward,
          idempotencyKey: `achievement:${a.key}:${userId}`,
          sourceId: a.id,
        })
        unlocked.push({
          id: a.id,
          key: a.key,
          name: a.name,
          description: a.description,
          icon: a.icon,
          category: a.category,
          xpReward: a.xpReward,
          earnedAt: ua.earnedAt.toISOString(),
        })
      }
    }
  }

  return unlocked
}

function checkCriteria(
  key: string,
  s: {
    lessonCount: number
    correctCount: number
    quizCount: number
    revisionCount: number
    codingCount: number
    contribCount: number
    streak: number
    xp: number
    focusCount: number
    focusMins: number
    voiceCount: number
    freezeCount: number
    questBonusCount: number
  },
): boolean {
  switch (key) {
    case 'first_lesson':
      return s.lessonCount >= 1
    case 'lessons_5':
      return s.lessonCount >= 5
    case 'lessons_10':
      return s.lessonCount >= 10
    case 'first_correct':
      return s.correctCount >= 1
    case 'correct_25':
      return s.correctCount >= 25
    case 'correct_100':
      return s.correctCount >= 100
    case 'first_quiz':
      return s.quizCount >= 1
    case 'quiz_5':
      return s.quizCount >= 5
    case 'first_revision':
      return s.revisionCount >= 1
    case 'revision_10':
      return s.revisionCount >= 10
    case 'first_code':
      return s.codingCount >= 1
    case 'first_contribution':
      return s.contribCount >= 1
    case 'streak_3':
      return s.streak >= 3
    case 'streak_7':
      return s.streak >= 7
    case 'streak_30':
      return s.streak >= 30
    case 'focus_first':
      return s.focusCount >= 1
    case 'focus_10':
      return s.focusCount >= 10
    case 'focus_500_mins':
      return s.focusMins >= 500
    case 'xp_200':
      return s.xp >= 200
    case 'xp_500':
      return s.xp >= 500
    case 'xp_1000':
      return s.xp >= 1000
    case 'freeze_first':
      return s.freezeCount >= 1
    case 'quest_master_3':
      return s.questBonusCount >= 3
    case 'quest_master_7':
      return s.questBonusCount >= 7
    default:
      return false
  }
}

import 'server-only'

import { db } from '@/lib/db'
import { canAttemptDatabase } from '@/lib/db-health'
import { getCurrentUser } from '@/lib/auth'
import { isDatabaseUnavailableError } from '@/lib/api-error-policy'
import { levelFromXp } from '@/lib/xp'
import {
  DEMO_ACHIEVEMENTS,
  DEMO_ACTIVITY,
  DEMO_PROGRESS,
  DEMO_REVISION_DUE,
  DEMO_SUBJECTS,
  DEMO_TASKS,
  DEMO_USER,
  isDemoMode,
} from '@/lib/demo-fixtures'
import type { AppBootstrapData, DashboardSnapshot } from '@/lib/app-bootstrap-types'
import type { ViewKey } from '@/lib/types'
import { publicUserSelect, toPublicUserDTO } from '@/lib/user-dto'
import { getLocalDateStringInKolkata, getLocalDayStartInKolkata } from '@/lib/timezone'
import { getStudentLearningScope } from '@/features/learning/server/get-student-learning-scope'

/**
 * Serialise a Prisma result (or any plain object graph containing Date
 * instances) into a form that is safe to pass from a Server Component to a
 * Client Component in the Next.js App Router.
 *
 * Previously this used `JSON.parse(JSON.stringify(value))` as a universal
 * serialiser. That works but (a) silently drops anything JSON cannot
 * represent, (b) loses Date precision by going through a string, and
 * (c) makes it impossible to tell at a glance what the function actually
 * does. This implementation is explicit: it walks the object graph and
 * converts Date to ISO string, arrays to arrays, and plain objects to plain
 * objects, leaving primitives untouched.
 *
 * If a value that cannot be serialised is encountered (e.g. a function or
 * a Symbol), it is dropped, matching the old JSON-clone behaviour.
 */
function serializeForClient<T>(value: T): T {
  if (value === null || value === undefined) return value
  if (value instanceof Date) return new Date(value.getTime()).toISOString() as unknown as T
  if (Array.isArray(value)) return value.map((item) => serializeForClient(item)) as unknown as T
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>)) {
      const v = (value as Record<string, unknown>)[key]
      if (typeof v === 'function' || typeof v === 'symbol') continue
      out[key] = serializeForClient(v)
    }
    return out as unknown as T
  }
  return value
}

async function getActivitySnapshot(userId: string, dailyMins: number) {
  const now = new Date()
  const todayStart = getLocalDayStartInKolkata(now)

  const sevenDaysAgo = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000)
  const heatStart = new Date(todayStart.getTime() - 90 * 24 * 60 * 60 * 1000)

  const [xpEvents, sessions, heatXp, heatSessions, lessonDays, qaDays] = await Promise.all([
    db.xpEvent.findMany({
      where: { userId, createdAt: { gte: sevenDaysAgo } },
      select: { amount: true, createdAt: true },
    }),
    db.studySession.findMany({
      where: { userId, startedAt: { gte: sevenDaysAgo } },
      select: { xpEarned: true, durationMins: true, startedAt: true },
    }),
    db.xpEvent.findMany({
      where: { userId, createdAt: { gte: heatStart } },
      select: { createdAt: true },
    }),
    db.studySession.findMany({
      where: { userId, startedAt: { gte: heatStart } },
      select: { startedAt: true },
    }),
    db.lessonCompletion.findMany({
      where: { userId, completedAt: { gte: heatStart } },
      select: { completedAt: true },
    }),
    db.questionAttempt.findMany({
      where: { userId, createdAt: { gte: heatStart } },
      select: { createdAt: true },
    }),
  ])

  const xpByDay = Array.from({ length: 7 }, () => 0)
  const dayBuckets = Array.from({ length: 7 }, (_, index) => {
    const d = new Date(todayStart.getTime() - (6 - index) * 24 * 60 * 60 * 1000)
    return getLocalDateStringInKolkata(d)
  })
  const bucketIndex = (date: Date) => dayBuckets.findIndex((bucket) => bucket === getLocalDateStringInKolkata(date))

  if (xpEvents.length > 0) {
    for (const event of xpEvents) {
      const index = bucketIndex(event.createdAt)
      if (index >= 0) xpByDay[index] += event.amount
    }
  } else {
    for (const session of sessions) {
      const index = bucketIndex(session.startedAt)
      if (index >= 0) xpByDay[index] += session.xpEarned || 0
    }
  }

  const minutesToday = sessions
    .filter((session) => getLocalDateStringInKolkata(session.startedAt) === getLocalDateStringInKolkata(todayStart))
    .reduce((sum, session) => sum + (session.durationMins || 0), 0)

  const activeDaySet = new Set<string>()
  for (const event of heatXp) activeDaySet.add(getLocalDateStringInKolkata(event.createdAt))
  for (const session of heatSessions) activeDaySet.add(getLocalDateStringInKolkata(session.startedAt))
  for (const lesson of lessonDays) {
    if (lesson.completedAt) activeDaySet.add(getLocalDateStringInKolkata(lesson.completedAt))
  }
  for (const attempt of qaDays) activeDaySet.add(getLocalDateStringInKolkata(attempt.createdAt))

  return {
    xpByDay,
    activeDays: Array.from(activeDaySet),
    minutesToday,
    dailyGoalMins: dailyMins || 60,
  }
}

async function getDashboardSnapshot(userId: string, dailyMins: number): Promise<DashboardSnapshot> {
  const now = new Date()
  const todayStart = getLocalDayStartInKolkata(now)
  const endOfDay = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1)

  const [
    mastery,
    lessonCompletions,
    questionAttempts,
    quizAttempts,
    studySessions,
    revisionSchedules,
    tasks,
    earned,
    activity,
  ] = await Promise.all([
    db.userTopicMastery.findMany({
      where: { userId },
      include: { topic: { include: { unit: { include: { subject: true } } } } },
    }),
    db.lessonCompletion.findMany({
      where: { userId },
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            order: true,
            durationMin: true,
            topicId: true,
            unitId: true,
          },
        },
      },
    }),
    db.questionAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    db.quizAttempt.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      take: 20,
    }),
    db.studySession.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      take: 30,
    }),
    db.revisionSchedule.findMany({
      where: { userId },
      include: { topic: { include: { unit: { include: { subject: true } } } } },
      orderBy: { nextDueDate: 'asc' },
    }),
    db.studyTask.findMany({
      where: { userId },
      orderBy: [{ scheduledDate: 'asc' }, { priority: 'desc' }],
    }),
    db.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { earnedAt: 'desc' },
    }),
    getActivitySnapshot(userId, dailyMins),
  ])

  return {
    progress: { mastery, lessonCompletions, questionAttempts, quizAttempts, studySessions },
    revisionDue: revisionSchedules.filter((item) => item.nextDueDate <= endOfDay),
    tasks,
    achievements: earned,
    activity,
  }
}

export async function getAppBootstrap(initialView: ViewKey): Promise<AppBootstrapData> {
  if (isDemoMode()) {
    return serializeForClient({
      user: toPublicUserDTO(DEMO_USER),
      subjects: DEMO_SUBJECTS,
      dashboard:
        initialView === 'dashboard'
          ? {
              progress: DEMO_PROGRESS,
              revisionDue: DEMO_REVISION_DUE.dueToday,
              tasks: DEMO_TASKS,
              achievements: DEMO_ACHIEVEMENTS.earned,
              activity: DEMO_ACTIVITY,
            }
          : null,
    })
  }

  if (!(await canAttemptDatabase())) {
    return serializeForClient({ user: null, subjects: [], dashboard: null })
  }

  let authUser: Awaited<ReturnType<typeof getCurrentUser>> = null
  try {
    authUser = await getCurrentUser()
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return serializeForClient({ user: null, subjects: [], dashboard: null })
    }
    throw error
  }

  if (!authUser) {
    return serializeForClient({ user: null, subjects: [], dashboard: null })
  }

  try {
    const [freshUser, learningScope] = await Promise.all([
      db.user.findUnique({ where: { id: authUser.id }, select: publicUserSelect }),
      getStudentLearningScope(authUser.id),
    ])

    const user = freshUser ? toPublicUserDTO({ ...freshUser, level: levelFromXp(freshUser.xp) }) : null
    const subjects = learningScope?.subjects ?? []
    const dashboard =
      initialView === 'dashboard' && user
        ? await getDashboardSnapshot(user.id, user.dailyMins)
        : null

    return serializeForClient({ user, subjects, dashboard })
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return serializeForClient({ user: null, subjects: [], dashboard: null })
    }
    throw error
  }
}

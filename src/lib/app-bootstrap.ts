import 'server-only'

import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
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

function toClient<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

async function getSubjects() {
  return db.subject.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      shortName: true,
      credits: true,
      icon: true,
      accentColor: true,
      mascotKey: true,
      description: true,
      units: {
        orderBy: { number: 'asc' },
        select: {
          id: true,
          number: true,
          title: true,
          description: true,
          weightage: true,
          topics: {
            orderBy: { title: 'asc' },
            select: {
              id: true,
              slug: true,
              title: true,
              description: true,
              difficulty: true,
              examWeightage: true,
            },
          },
          lessons: {
            orderBy: { order: 'asc' },
            select: {
              id: true,
              title: true,
              order: true,
              durationMin: true,
            },
          },
        },
      },
    },
    orderBy: { code: 'asc' },
  })
}

async function getActivitySnapshot(userId: string, dailyMins: number) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  sevenDaysAgo.setHours(0, 0, 0, 0)

  const heatStart = new Date(now)
  heatStart.setDate(heatStart.getDate() - 90)
  heatStart.setHours(0, 0, 0, 0)

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
    const d = new Date(now)
    d.setDate(d.getDate() - (6 - index))
    d.setHours(0, 0, 0, 0)
    return d.toDateString()
  })
  const bucketIndex = (date: Date) => dayBuckets.findIndex((bucket) => bucket === date.toDateString())

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
    .filter((session) => session.startedAt.toDateString() === todayStart.toDateString())
    .reduce((sum, session) => sum + (session.durationMins || 0), 0)

  const activeDaySet = new Set<string>()
  for (const event of heatXp) activeDaySet.add(event.createdAt.toISOString().slice(0, 10))
  for (const session of heatSessions) activeDaySet.add(session.startedAt.toISOString().slice(0, 10))
  for (const lesson of lessonDays) {
    if (lesson.completedAt) activeDaySet.add(lesson.completedAt.toISOString().slice(0, 10))
  }
  for (const attempt of qaDays) activeDaySet.add(attempt.createdAt.toISOString().slice(0, 10))

  return {
    xpByDay,
    activeDays: Array.from(activeDaySet),
    minutesToday,
    dailyGoalMins: dailyMins || 60,
  }
}

async function getDashboardSnapshot(userId: string, dailyMins: number): Promise<DashboardSnapshot> {
  const now = new Date()
  const endOfDay = new Date(now)
  endOfDay.setHours(23, 59, 59, 999)

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
    return toClient({
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

  const authUser = await getCurrentUser()
  const [freshUser, subjects] = await Promise.all([
    authUser ? db.user.findUnique({ where: { id: authUser.id }, select: publicUserSelect }) : null,
    getSubjects(),
  ])

  const user = freshUser ? toPublicUserDTO({ ...freshUser, level: levelFromXp(freshUser.xp) }) : null
  const dashboard =
    initialView === 'dashboard' && user
      ? await getDashboardSnapshot(user.id, user.dailyMins)
      : null

  return toClient({ user, subjects, dashboard })
}

/**
 * GET /api/user/export
 *
 * Returns the authenticated user's complete data bundle as JSON — used by the
 * Profile view's "Export My Data" button to download `lernio-my-data.json`.
 *
 * Trust model: requireUser() enforces auth; the export only ever returns the
 * caller's own data (no userId is accepted from the client).
 *
 * The bundle is shaped for human readability: profile, lesson completions,
 * question attempts, quiz attempts, revision schedules, tutor sessions,
 * coding submissions, achievements, and the XP ledger.
 */
import { db } from '@/lib/db'
import { requireUser, withApi, okResponse } from '@/lib/auth'

export const GET = () =>
  withApi(async () => {
    const user = await requireUser()

    const [
      profile,
      lessonCompletions,
      questionAttempts,
      quizAttempts,
      revisionSchedules,
      revisionAttempts,
      studySessions,
      studyTasks,
      tutorSessions,
      tutorMessages,
      codingSubmissions,
      labProgress,
      achievements,
      xpEvents,
      contributions,
      bookmarks,
      mastery,
    ] = await Promise.all([
      db.user.findUnique({
        where: { id: user.id },
        // Explicitly select non-sensitive fields; avatar is a URL only.
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          preferredLang: true,
          examDate: true,
          dailyMins: true,
          semesterNumber: true,
          xp: true,
          level: true,
          streak: true,
          lastActiveDate: true,
          onboarded: true,
          avatar: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.lessonCompletion.findMany({
        where: { userId: user.id },
        include: { lesson: { select: { id: true, title: true } } },
      }),
      db.questionAttempt.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      db.quizAttempt.findMany({
        where: { userId: user.id },
        orderBy: { startedAt: 'desc' },
        take: 100,
      }),
      db.revisionSchedule.findMany({
        where: { userId: user.id },
        include: { topic: { select: { id: true, title: true } } },
      }),
      db.revisionAttempt.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      db.studySession.findMany({
        where: { userId: user.id },
        orderBy: { startedAt: 'desc' },
        take: 200,
      }),
      db.studyTask.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      db.tutorSession.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: 'desc' },
        take: 100,
      }),
      db.tutorMessage.findMany({
        where: { session: { userId: user.id } },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      }),
      db.codingSubmission.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      db.labProgress.findMany({ where: { userId: user.id } }),
      db.userAchievement.findMany({
        where: { userId: user.id },
        include: { achievement: true },
        orderBy: { earnedAt: 'desc' },
      }),
      db.xpEvent.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      }),
      db.contribution.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: 'desc' },
      }),
      db.bookmark.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      }),
      db.userTopicMastery.findMany({
        where: { userId: user.id },
        include: { topic: { select: { id: true, title: true } } },
      }),
    ])

    return okResponse({
      exportedAt: new Date().toISOString(),
      schemaVersion: 1,
      profile,
      lessonCompletions,
      questionAttempts,
      quizAttempts,
      revisionSchedules,
      revisionAttempts,
      studySessions,
      studyTasks,
      tutorSessions,
      tutorMessages,
      codingSubmissions,
      labProgress,
      achievements,
      xpEvents,
      contributions,
      bookmarks,
      mastery,
    })
  })

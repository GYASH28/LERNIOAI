import { db } from '@/lib/db'
import { requireUser, withApi, okResponse } from '@/lib/auth'
import {
  getStudentLearningScope,
  scopedLessonWhere,
  scopedQuestionWhere,
} from '@/features/learning/server/get-student-learning-scope'

/**
 * GET /api/analytics/readiness/all
 *
 * Returns a condensed readiness snapshot for ALL the user's subjects, computed
 * in parallel via the deterministic heuristic (NO LLM call per subject — that
 * would be slow + expensive for a 4-subject radar overlay).
 *
 * Used by the SubjectReadinessRadar component on the Analytics view.
 *
 * Response:
 *   {
 *     subjects: Array<{
 *       subjectId, subjectName, subjectCode, subjectAccent,
 *       readinessScore: 0-100,
 *       inputs: { lessonsCompleted, lessonsAvailable, accuracy, questionsAttempted,
 *                 quizzesTaken, avgQuizScore, focusMinutes, masteredTopics,
 *                 weakTopics, revisionCount },
 *       bucket: 'critical' | 'low' | 'medium' | 'high' | 'ready'
 *     }>,
 *     overall: number,  // weighted average across subjects by credits
 *     generatedAt: ISO
 *   }
 */
export async function GET() {
  return withApi(async () => {
    const authUser = await requireUser()
    const user = await db.user.findUnique({
      where: { id: authUser.id },
      select: { xp: true, streak: true, examDate: true },
    })
    if (!user) return okResponse({ subjects: [], overall: 0, generatedAt: new Date().toISOString() })

    const scope = await getStudentLearningScope(authUser.id)
    if (!scope) {
      return okResponse({ subjects: [], overall: 0, generatedAt: new Date().toISOString() })
    }

    const subjects = scope.subjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
      code: subject.code,
      accentColor: subject.accentColor,
      credits: subject.credits,
    }))

    if (subjects.length === 0) {
      return okResponse({ subjects: [], overall: 0, generatedAt: new Date().toISOString() })
    }

    // For each subject, gather the 9 inputs in parallel via Promise.all.
    // (4 subjects × 7 queries = 28 queries — fine for SQLite.)
    const subjectResults = await Promise.all(
      subjects.map(async (subject) => {
        const [
          lessonsCompleted,
          lessonsAvailable,
          questionsAttempted,
          questionsCorrect,
          quizAgg,
          focusAgg,
          revisionCount,
          masteryAgg,
        ] = await Promise.all([
          db.lessonCompletion.count({
            where: {
              userId: authUser.id,
              completedAt: { not: null },
              lesson: {
                AND: [
                  scopedLessonWhere(scope),
                  scopedLessonSubjectWhere(subject.id),
                ],
              },
            },
          }),
          db.lesson.count({
            where: {
              AND: [
                scopedLessonWhere(scope),
                scopedLessonSubjectWhere(subject.id),
              ],
            },
          }),
          db.questionAttempt.count({
            where: {
              userId: authUser.id,
              question: {
                ...scopedQuestionWhere(scope),
                subjectId: subject.id,
              },
            },
          }),
          db.questionAttempt.count({
            where: {
              userId: authUser.id,
              isCorrect: true,
              question: {
                ...scopedQuestionWhere(scope),
                subjectId: subject.id,
              },
            },
          }),
          db.quizAttempt.aggregate({
            _count: true,
            _avg: { score: true },
            where: { userId: authUser.id, subjectId: subject.id, completedAt: { not: null } },
          }),
          db.studySession.aggregate({
            _sum: { durationMins: true },
            where: { userId: authUser.id, subjectId: subject.id },
          }),
          countScopedRevisionAttempts(authUser.id, subject.id),
          db.userTopicMastery.groupBy({
            by: ['state'],
            where: {
              userId: authUser.id,
              topic: {
                status: 'active',
                archivedAt: null,
                unit: {
                  status: 'active',
                  archivedAt: null,
                  subjectId: subject.id,
                },
              },
            },
            _count: true,
          }),
        ])

        const masteryByState = new Map<string, number>()
        for (const row of masteryAgg) masteryByState.set(row.state, row._count)
        const masteredTopics =
          (masteryByState.get('mastered') ?? 0) + (masteryByState.get('proficient') ?? 0)
        const weakTopics =
          (masteryByState.get('weak') ?? 0) + (masteryByState.get('learning') ?? 0)

        const accuracy =
          questionsAttempted > 0 ? Math.round((questionsCorrect / questionsAttempted) * 100) : 0
        const avgQuizScore = quizAgg._avg.score ? Math.round(quizAgg._avg.score) : 0
        const focusMinutes = focusAgg._sum.durationMins ?? 0

        const inputs = {
          lessonsCompleted,
          lessonsAvailable,
          questionsAttempted,
          questionsCorrect,
          accuracy,
          quizzesTaken: quizAgg._count,
          avgQuizScore,
          focusMinutes,
          revisionCount,
          masteredTopics,
          weakTopics,
        }

        const readinessScore = computeHeuristicScore(inputs)
        const bucket = bucketize(readinessScore)

        return {
          subjectId: subject.id,
          subjectName: subject.name,
          subjectCode: subject.code,
          subjectAccent: subject.accentColor,
          credits: subject.credits,
          readinessScore,
          inputs,
          bucket,
        }
      }),
    )

    // Overall = weighted average by subject credits.
    const totalCredits = subjectResults.reduce((s, r) => s + (r.credits || 4), 0)
    const weightedSum = subjectResults.reduce(
      (s, r) => s + r.readinessScore * (r.credits || 4),
      0,
    )
    const overall = totalCredits > 0 ? Math.round(weightedSum / totalCredits) : 0

    return okResponse({
      subjects: subjectResults,
      overall,
      generatedAt: new Date().toISOString(),
    })
  })
}

// ============================================================
// Helpers — mirror the heuristic in /api/analytics/readiness
// ============================================================

function scopedLessonSubjectWhere(subjectId: string) {
  return {
    OR: [
      { topic: { unit: { subjectId } } },
      { unit: { subjectId } },
    ],
  }
}

async function countScopedRevisionAttempts(userId: string, subjectId: string): Promise<number> {
  const schedules = await db.revisionSchedule.findMany({
    where: {
      userId,
      topic: {
        status: 'active',
        archivedAt: null,
        unit: {
          status: 'active',
          archivedAt: null,
          subjectId,
        },
      },
    },
    select: { id: true },
  })
  if (schedules.length === 0) return 0
  return db.revisionAttempt.count({
    where: { userId, scheduleId: { in: schedules.map((schedule) => schedule.id) } },
  })
}

interface HeuristicInputs {
  lessonsCompleted: number
  lessonsAvailable: number
  questionsAttempted: number
  accuracy: number
  quizzesTaken: number
  avgQuizScore: number
  focusMinutes: number
  revisionCount: number
  masteredTopics: number
  weakTopics: number
}

function computeHeuristicScore(s: HeuristicInputs): number {
  if (s.lessonsAvailable === 0) return 0
  const lessonProgress = s.lessonsCompleted / Math.max(1, s.lessonsAvailable)
  const accuracyScore = s.accuracy / 100
  const practiceScore = Math.min(1, s.questionsAttempted / 50)
  const masteryScore =
    s.masteredTopics + s.weakTopics > 0
      ? s.masteredTopics / (s.masteredTopics + s.weakTopics)
      : 0
  const revisionScore = Math.min(1, s.revisionCount / 20)
  const focusScore = Math.min(1, s.focusMinutes / 300)

  const score =
    lessonProgress * 25 +
    accuracyScore * 25 +
    practiceScore * 15 +
    masteryScore * 20 +
    revisionScore * 5 +
    focusScore * 10

  return Math.round(Math.max(0, Math.min(100, score)))
}

function bucketize(score: number): 'critical' | 'low' | 'medium' | 'high' | 'ready' {
  if (score < 15) return 'critical'
  if (score < 35) return 'low'
  if (score < 60) return 'medium'
  if (score < 85) return 'high'
  return 'ready'
}

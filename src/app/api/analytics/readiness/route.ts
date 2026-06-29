import { db } from '@/lib/db'
import { requireUser, withApi, okResponse, ApiError } from '@/lib/auth'
import { getAiProvider } from '@/lib/ai/provider'
import {
  getStudentLearningScope,
  isSubjectIdInLearningScope,
  scopedLessonWhere,
  scopedQuestionWhere,
  scopedSubjectWhere,
} from '@/features/learning/server/get-student-learning-scope'

/**
 * POST /api/analytics/readiness
 * Body: { subjectId: string }
 *
 * AI-driven exam readiness predictor. Aggregates the user's real activity for
 * the subject — lesson completions, question attempts (correct/total/accuracy),
 * quiz scores, focus session minutes, revision activity, mastery distribution —
 * then asks the LLM to:
 *   1. Produce a readiness score (0-100)
 *   2. Identify 2-4 strengths
 *   3. Identify 2-4 weaknesses / at-risk topics
 *   4. Recommend 3-5 specific study actions
 *
 * The LLM is forced to return strict JSON via a system prompt that bans prose.
 * On any failure we fall back to a deterministic heuristic-based score so the
 * widget always renders. The `usedFallback` flag is returned so the UI can
 * show an "AI estimate" disclaimer.
 */

interface ReadinessResult {
  subjectId: string
  subjectName: string
  readinessScore: number
  strengths: string[]
  weaknesses: string[]
  recommendations: Array<{ action: string; reason: string; priority: 'high' | 'medium' | 'low' }>
  inputs: {
    lessonsCompleted: number
    lessonsAvailable: number
    questionsAttempted: number
    questionsCorrect: number
    accuracy: number
    quizzesTaken: number
    avgQuizScore: number
    focusMinutes: number
    revisionCount: number
    masteredTopics: number
    weakTopics: number
    daysToExam: number | null
  }
  usedFallback: boolean
  generatedAt: string
}

export async function POST(req: Request) {
  return withApi(async () => {
    const authUser = await requireUser()
    // requireUser returns only basic fields; fetch the full User row for xp/streak/examDate.
    const user = await db.user.findUnique({
      where: { id: authUser.id },
      select: { xp: true, streak: true, examDate: true },
    })
    if (!user) throw new ApiError('NOT_FOUND', 'user not found', 404, false)

    const body = (await req.json().catch(() => ({}))) as { subjectId?: string }
    if (!body.subjectId) throw new ApiError('BAD_REQUEST', 'subjectId required', 400, false)
    const scope = await getStudentLearningScope(authUser.id)
    if (!scope || !isSubjectIdInLearningScope(scope, body.subjectId)) {
      throw new ApiError('NOT_FOUND', 'subject not found', 404, false)
    }

    // Gather everything in parallel — much faster than serial queries.
    const [subject, lessonsCompletedAgg, lessonsTotalAgg, questionAgg, correctCount, quizAgg, focusAgg, revisionCount, masteryAgg] =
      await Promise.all([
        db.subject.findFirst({
          where: { id: body.subjectId, ...scopedSubjectWhere(scope) },
          select: { id: true, name: true, code: true },
        }),
        db.lessonCompletion.count({
          where: {
            userId: authUser.id,
            completedAt: { not: null },
            lesson: {
              AND: [
                scopedLessonWhere(scope),
                scopedLessonSubjectWhere(body.subjectId),
              ],
            },
          },
        }),
        db.lesson.count({
          where: {
            AND: [
              scopedLessonWhere(scope),
              scopedLessonSubjectWhere(body.subjectId),
            ],
          },
        }),
        db.questionAttempt.count({
          where: {
            userId: authUser.id,
            question: {
              ...scopedQuestionWhere(scope),
              subjectId: body.subjectId,
            },
          },
        }),
        // separate correct count — can't combine with above because isCorrect is nullable
        db.questionAttempt.count({
          where: {
            userId: authUser.id,
            isCorrect: true,
            question: {
              ...scopedQuestionWhere(scope),
              subjectId: body.subjectId,
            },
          },
        }),
        db.quizAttempt.aggregate({
          _count: true,
          _avg: { score: true },
          where: { userId: authUser.id, subjectId: body.subjectId, completedAt: { not: null } },
        }),
        db.studySession.aggregate({
          _sum: { durationMins: true },
          where: { userId: authUser.id, subjectId: body.subjectId },
        }),
        countScopedRevisionAttempts(authUser.id, body.subjectId),
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
                subjectId: body.subjectId,
              },
            },
          },
          _count: true,
        }),
      ])

    if (!subject) throw new ApiError('NOT_FOUND', 'subject not found', 404, false)

    // Tally mastery buckets
    const masteryByState = new Map<string, number>()
    for (const row of masteryAgg) masteryByState.set(row.state, row._count)
    const masteredTopics = (masteryByState.get('mastered') ?? 0) + (masteryByState.get('proficient') ?? 0)
    const weakTopics = (masteryByState.get('weak') ?? 0) + (masteryByState.get('learning') ?? 0)

    const questionsAttempted = questionAgg
    const accuracy = questionsAttempted > 0 ? Math.round((correctCount / questionsAttempted) * 100) : 0
    const avgQuizScore = quizAgg._avg.score ? Math.round(quizAgg._avg.score) : 0
    const focusMinutes = focusAgg._sum.durationMins ?? 0

    // Days until exam (if user has set an examDate)
    let daysToExam: number | null = null
    if (user.examDate) {
      const exam = new Date(user.examDate + 'T00:00:00')
      const diffMs = exam.getTime() - Date.now()
      daysToExam = Math.max(0, Math.round(diffMs / 86_400_000))
    }

    const inputs = {
      lessonsCompleted: lessonsCompletedAgg,
      lessonsAvailable: lessonsTotalAgg,
      questionsAttempted,
      questionsCorrect: correctCount,
      accuracy,
      quizzesTaken: quizAgg._count,
      avgQuizScore,
      focusMinutes,
      revisionCount,
      masteredTopics,
      weakTopics,
      daysToExam,
    }

    // Deterministic fallback score (used if AI fails)
    const fallbackScore = computeHeuristicScore(inputs)

    // Try AI prediction
    let aiResult:
      | {
          readinessScore: number
          strengths: string[]
          weaknesses: string[]
          recommendations: Array<{ action: string; reason: string; priority: 'high' | 'medium' | 'low' }>
        }
      | null = null
    let usedFallback = false

    try {
      const systemPrompt = [
        'You are LEO, an academic mentor for diploma engineering students.',
        'Analyse the student\'s real activity data below for the subject and predict their exam readiness.',
        '',
        'Return STRICT JSON only (no markdown fences, no prose) with this schema:',
        '{',
        '  "readinessScore": <integer 0-100>,',
        '  "strengths": [<2-4 short strings>],',
        '  "weaknesses": [<2-4 short strings>],',
        '  "recommendations": [',
        '    { "action": "<specific study action>", "reason": "<why>", "priority": "high|medium|low" }',
        '  ]  // 3-5 items',
        '}',
        '',
        'Rules:',
        '- readinessScore must reflect actual mastery + practice volume, NOT optimism.',
        '- If the student has <5 questions attempted or <2 lessons, cap readiness at 25.',
        '- strengths/weaknesses should reference specific topics or skill areas when possible.',
        '- recommendations should be specific, actionable study tasks (not generic advice).',
        '- NEVER mention you are an AI; speak as LEO.',
      ].join('\n')

      const userPrompt = [
        `Subject: ${subject.name} (${subject.code})`,
        `Current XP: ${user.xp}`,
        `Days to exam: ${daysToExam ?? 'not set'}`,
        `Current streak: ${user.streak} days`,
        '',
        'Activity data:',
        `- Lessons completed: ${lessonsCompletedAgg} / ${lessonsTotalAgg} available`,
        `- Questions attempted: ${questionsAttempted} (correct: ${correctCount}, accuracy: ${accuracy}%)`,
        `- Quizzes taken: ${quizAgg._count} (avg score: ${avgQuizScore})`,
        `- Focus session minutes: ${focusMinutes}`,
        `- Revision attempts: ${revisionCount}`,
        `- Topic mastery: ${masteredTopics} mastered/proficient, ${weakTopics} weak/learning`,
      ].join('\n')

      const resp = await getAiProvider().chat({
        systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        maxTokens: 700,
      })

      aiResult = parseReadinessJson(resp.content, fallbackScore)
      if (!aiResult) usedFallback = true
    } catch {
      // AI failure — fall back to deterministic heuristic score so the widget
      // always renders. The error is logged inside the provider; we don't need
      // to surface it to the client.
      usedFallback = true
    }

    const result: ReadinessResult = {
      subjectId: subject.id,
      subjectName: subject.name,
      readinessScore: aiResult?.readinessScore ?? fallbackScore,
      strengths: aiResult?.strengths ?? defaultStrengths(inputs),
      weaknesses: aiResult?.weaknesses ?? defaultWeaknesses(inputs),
      recommendations:
        aiResult?.recommendations ?? defaultRecommendations(inputs, subject.name),
      inputs,
      usedFallback,
      generatedAt: new Date().toISOString(),
    }

    return okResponse(result)
  })
}

// ============================================================
// Helpers
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

function computeHeuristicScore(s: ReadinessResult['inputs']): number {
  if (s.lessonsAvailable === 0) return 0
  const lessonProgress = s.lessonsCompleted / Math.max(1, s.lessonsAvailable)
  const accuracyScore = s.accuracy / 100
  const practiceScore = Math.min(1, s.questionsAttempted / 50)
  const masteryScore = s.lessonsAvailable > 0 ? s.masteredTopics / Math.max(1, s.masteredTopics + s.weakTopics) : 0
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

function parseReadinessJson(
  raw: string,
  fallbackScore: number,
): {
  readinessScore: number
  strengths: string[]
  weaknesses: string[]
  recommendations: Array<{ action: string; reason: string; priority: 'high' | 'medium' | 'low' }>
} | null {
  try {
    // Strip markdown fences if present
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim()
    const obj = JSON.parse(cleaned) as unknown
    if (typeof obj !== 'object' || obj === null) return null
    const record = obj as Record<string, unknown>

    const readinessScore = clampInt(record.readinessScore, 0, 100, fallbackScore)
    const strengths = arrayOfStrings(record.strengths).slice(0, 4)
    const weaknesses = arrayOfStrings(record.weaknesses).slice(0, 4)
    const recs = Array.isArray(record.recommendations)
      ? record.recommendations
          .filter(isRecord)
          .slice(0, 5)
          .map((r) => {
            const priority =
              typeof r.priority === 'string' && ['high', 'medium', 'low'].includes(r.priority)
                ? r.priority as 'high' | 'medium' | 'low'
                : 'medium'
            return {
              action: String(r.action ?? '').slice(0, 200),
              reason: String(r.reason ?? '').slice(0, 200),
              priority,
            }
          })
          .filter((r) => r.action)
      : []

    if (strengths.length === 0 && weaknesses.length === 0 && recs.length === 0) {
      return null
    }

    return { readinessScore, strengths, weaknesses, recommendations: recs }
  } catch {
    return null
  }
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === 'number' ? v : Number.parseFloat(String(v))
  if (!Number.isFinite(n)) return fallback
  return Math.round(Math.max(min, Math.min(max, n)))
}

function arrayOfStrings(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v
    .filter((x) => typeof x === 'string' && x.trim().length > 0)
    .map((x) => x.trim().slice(0, 200))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function defaultStrengths(s: ReadinessResult['inputs']): string[] {
  const out: string[] = []
  if (s.accuracy >= 70) out.push(`Strong accuracy (${s.accuracy}%)`)
  if (s.masteredTopics >= 3) out.push(`${s.masteredTopics} topics mastered`)
  if (s.focusMinutes >= 120) out.push(`${s.focusMinutes} focused study minutes`)
  if (s.lessonsCompleted >= 5) out.push(`${s.lessonsCompleted} lessons completed`)
  return out.length ? out : ['Getting started — keep practising!']
}

function defaultWeaknesses(s: ReadinessResult['inputs']): string[] {
  const out: string[] = []
  if (s.accuracy < 60 && s.questionsAttempted > 0) out.push(`Accuracy needs work (${s.accuracy}%)`)
  if (s.weakTopics >= 2) out.push(`${s.weakTopics} topics marked weak`)
  if (s.revisionCount < 5) out.push('Limited spaced-revision activity')
  if (s.lessonsAvailable > 0 && s.lessonsCompleted / s.lessonsAvailable < 0.5)
    out.push('Less than half of lessons completed')
  return out.length ? out : ['No significant weaknesses detected yet']
}

function defaultRecommendations(
  s: ReadinessResult['inputs'],
  subjectName: string,
): Array<{ action: string; reason: string; priority: 'high' | 'medium' | 'low' }> {
  const recs: Array<{ action: string; reason: string; priority: 'high' | 'medium' | 'low' }> = []
  if (s.lessonsAvailable > 0 && s.lessonsCompleted / s.lessonsAvailable < 0.5) {
    recs.push({
      action: `Complete more ${subjectName} lessons`,
      reason: 'You have not finished half of the available lessons yet.',
      priority: 'high',
    })
  }
  if (s.questionsAttempted < 20) {
    recs.push({
      action: 'Practise 20+ MCQs in Practice mode',
      reason: 'Build exam stamina with more question attempts.',
      priority: 'high',
    })
  }
  if (s.weakTopics >= 2) {
    recs.push({
      action: 'Review weak topics with the Smart Revision tool',
      reason: `${s.weakTopics} topics flagged weak — spaced repetition will lock them in.`,
      priority: 'medium',
    })
  }
  if (s.focusMinutes < 60) {
    recs.push({
      action: 'Run a 25-minute Focus Timer session',
      reason: 'Active recall under timed conditions improves retention.',
      priority: 'medium',
    })
  }
  recs.push({
    action: 'Take a full Mock Exam',
    reason: 'Test end-to-end readiness under exam conditions.',
    priority: s.quizzesTaken === 0 ? 'high' : 'low',
  })
  return recs.slice(0, 5)
}

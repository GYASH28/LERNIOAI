import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, withApi, okResponse } from '@/lib/auth'
import { parseBody, quizAttemptSchema } from '@/lib/schemas'
import { evaluateAnswer } from '@/lib/questions'
import { awardXp } from '@/lib/xp'
import { evaluateAchievements } from '@/lib/achievements'

/**
 * GET /api/exams
 * Returns published question papers (with optional subjectId filter).
 */
export async function GET(req: NextRequest) {
  return withApi(async () => {
    await requireUser()
    const sp = req.nextUrl.searchParams
    const subjectId = sp.get('subjectId')
    const where = subjectId ? { subjectId } : {}
    const papers = await db.questionPaper.findMany({
      where,
      orderBy: { year: 'desc' },
    })
    return okResponse(papers)
  })
}

/**
 * POST /api/exams
 * Submit a quiz/exam attempt. The server RE-SCORES the answers from
 * `answersJson` using `evaluateAnswer()` — it ignores any client-supplied
 * `correctCount`, `score`, `maxScore`, or `negativeMarks`.
 *
 * XP is awarded via the idempotent ledger on submission.
 * Achievements are evaluated after the verified write.
 */
export async function POST(req: NextRequest) {
  return withApi(async () => {
    const user = await requireUser()
    const body = await parseBody(req, quizAttemptSchema)

    // Resolve the questions server-side; never trust the client's view of them.
    const questionIds = body.answersJson.map((a) => a.questionId)
    const questions = await db.question.findMany({ where: { id: { in: questionIds } } })
    const questionMap = new Map(questions.map((q) => [q.id, q]))

    let correctCount = 0
    let earnedMarks = 0
    let lostMarks = 0
    let maxScore = 0
    // Each review item carries the server-scored verdict AND the question's
    // answer-side fields (correctAnswer / explanation / hint / options) so the
    // client can render a complete review screen without another round-trip
    // (and without /api/questions ever leaking those fields pre-submit).
    const scoredAnswers: Array<{
      questionId: string
      question: string
      type: string
      options: string[] | null
      answer: string | null
      isCorrect: boolean
      marks: number
      negativeMark: number
      correctAnswer: string | null
      explanation: string | null
      hint: string | null
      timeTakenMs?: number
      hintUsed?: boolean
      flagged?: boolean
    }> = []

    for (const ans of body.answersJson) {
      const q = questionMap.get(ans.questionId)
      if (!q) continue // ignore stray answer for missing question
      maxScore += q.marks
      const { isCorrect } = evaluateAnswer(q, ans.answer ?? null)
      let marksAwarded = 0
      if (isCorrect) {
        correctCount += 1
        marksAwarded = q.marks
        earnedMarks += q.marks
      } else if (ans.answer !== null && ans.answer !== undefined && ans.answer !== '') {
        // Only deduct negative marks when an actual (wrong) answer was given.
        marksAwarded = -q.negativeMark
        lostMarks += q.negativeMark
      }
      let options: string[] | null = null
      if (q.options) {
        try {
          const parsed = JSON.parse(q.options)
          if (Array.isArray(parsed)) options = parsed.map(String)
        } catch {
          options = null
        }
      }
      scoredAnswers.push({
        questionId: q.id,
        question: q.question,
        type: q.type,
        options,
        answer: ans.answer ?? null,
        isCorrect,
        marks: marksAwarded,
        negativeMark: q.negativeMark,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        hint: q.hint,
        timeTakenMs: ans.timeTakenMs,
        hintUsed: ans.hintUsed,
        flagged: ans.flagged,
      })
    }

    const finalScore = Math.max(0, earnedMarks - lostMarks)
    const negativeMarks = lostMarks
    const totalQuestions = body.answersJson.length

    const attempt = await db.quizAttempt.create({
      data: {
        userId: user.id,
        subjectId: body.subjectId,
        mode: body.mode,
        unitNumbers: body.unitNumbers ? JSON.stringify(body.unitNumbers) : null,
        totalQuestions,
        correctCount,
        score: finalScore,
        maxScore,
        durationMs: body.durationMs ?? 0,
        negativeMarks,
        answersJson: JSON.stringify(scoredAnswers),
        completedAt: new Date(),
      },
    })

    // Award XP via the idempotent ledger.
    const baseXp = body.mode === 'mock_exam' ? 50 : body.mode === 'chapter_test' ? 25 : 10
    const scoreXp = Math.round(finalScore)
    const xp = await awardXp({
      userId: user.id,
      eventType: 'quiz_submit',
      amount: baseXp + scoreXp,
      idempotencyKey: `quiz_submit:${attempt.id}`,
      sourceId: attempt.id,
    })

    // Achievement evaluation after the verified write.
    try {
      await evaluateAchievements({ userId: user.id, trigger: 'quiz_submit' })
    } catch {
      // never break user flow
    }

    // Re-read authoritative total after achievement awards.
    const finalUser = await db.user.findUnique({
      where: { id: user.id },
      select: { xp: true },
    })

    return okResponse({
      attempt,
      xpGain: xp.awarded ? xp.amount : 0,
      totalXp: finalUser?.xp ?? 0,
      // Include the server-scored review data so the client can show analysis
      // without re-fetching the (now hidden) correct answers from /api/questions.
      review: scoredAnswers,
    })
  })
}

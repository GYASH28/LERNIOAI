import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, withApi, okResponse, ApiError } from '@/lib/auth'
import { parseBody, createAttemptSchema } from '@/lib/schemas'
import { toExamDTO, type ExamQuestionDTO } from '@/lib/questions'

/**
 * POST /api/exams/attempt
 *
 * Start a new exam attempt. The server loads + stores the question set
 * (as safe ExamQuestionDTOs — answers stripped) so:
 *   - the client never needs to re-fetch questions (no answer leakage window),
 *   - submit can re-score against the exact same set,
 *   - resume can return the same questions + autosaved answers.
 *
 * Lifecycle: create (here) -> autosave (PATCH [id]) -> submit (POST [id]/submit).
 * The attempt is created with status='in_progress' and is locked after submit.
 */
export async function POST(req: NextRequest) {
  return withApi(async () => {
    const user = await requireUser()
    const body = await parseBody(req, createAttemptSchema)

    // Resolve the question paper (if given) — server-authoritative source of
    // subject + duration + totalMarks. The body.subjectId is only used as a
    // fallback / for chapter tests.
    let paperSubjectId = body.subjectId
    let durationMins = body.durationMins
    let paperTitle: string | null = null
    if (body.questionPaperId) {
      const paper = await db.questionPaper.findUnique({
        where: { id: body.questionPaperId },
        select: { id: true, subjectId: true, duration: true, totalMarks: true, title: true },
      })
      if (!paper) {
        throw new ApiError('NOT_FOUND', 'Question paper not found.', 404, false)
      }
      paperSubjectId = paper.subjectId
      if (durationMins === undefined) durationMins = paper.duration
      paperTitle = paper.title
    }

    // Sensible defaults if still unset.
    if (durationMins === undefined) {
      durationMins = body.mode === 'mock' ? 180 : 30
    }

    // ------------------------------------------------------------------
    // Load the question set server-side. We deliberately use simple random
    // selection (Math.random shuffle) — same as the previous client-side
    // behaviour — but now the result is held by the server.
    // ------------------------------------------------------------------
    const where: Record<string, unknown> = { subjectId: paperSubjectId }
    if (body.difficulty) where.difficulty = body.difficulty
    if (body.unitNumbers && body.unitNumbers.length > 0) {
      where.unitNumber = { in: body.unitNumbers }
    }

    const allQuestions = await db.question.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200, // upper bound before random sampling
    })

    if (allQuestions.length === 0) {
      throw new ApiError(
        'NO_QUESTIONS',
        'No questions are available for this subject yet.',
        404,
        false,
      )
    }

    // Fisher–Yates shuffle then take N.
    const targetCount =
      body.questionCount ?? (body.mode === 'mock' ? 50 : 10)
    const shuffled = [...allQuestions]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    const selected = shuffled.slice(0, Math.min(targetCount, shuffled.length))

    // Strip answer-bearing fields before storing + returning.
    const safeDTOs: ExamQuestionDTO[] = selected.map(toExamDTO)
    const questionIds = safeDTOs.map((q) => q.id)
    const maxScore = safeDTOs.reduce((sum, q) => sum + q.marks, 0)

    // Map the create-time 'mock' | 'chapter' enum to the stored mode enum.
    const storedMode = body.mode === 'mock' ? 'mock_exam' : 'chapter_test'

    // ------------------------------------------------------------------
    // Persist the attempt + server-held question set.
    // answersJson starts as an empty autosave blob; submit replaces it with
    // the scored review payload.
    // ------------------------------------------------------------------
    const attempt = await db.quizAttempt.create({
      data: {
        userId: user.id,
        subjectId: paperSubjectId,
        mode: storedMode,
        status: 'in_progress',
        unitNumbers: body.unitNumbers && body.unitNumbers.length > 0
          ? JSON.stringify(body.unitNumbers)
          : null,
        questionsJson: JSON.stringify({
          questions: safeDTOs,
          questionIds,
          durationMins,
          paperId: body.questionPaperId ?? null,
          paperTitle,
        }),
        totalQuestions: safeDTOs.length,
        correctCount: 0,
        score: 0,
        maxScore,
        durationMs: 0,
        negativeMarks: 0,
        startedAt: new Date(),
        completedAt: null,
        answersJson: JSON.stringify({
          answers: {},
          flagged: [],
          timeLeftSec: durationMins * 60,
          currentIdx: 0,
        }),
      },
      select: { id: true, startedAt: true },
    })

    return okResponse({
      attemptId: attempt.id,
      questions: safeDTOs,
      durationMins,
      startedAt: attempt.startedAt,
    })
  })
}

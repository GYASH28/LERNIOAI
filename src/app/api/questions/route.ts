import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, withApi, okResponse } from '@/lib/auth'
import { toPracticeDTO } from '@/lib/questions'

/**
 * GET /api/questions
 * Returns PracticeQuestionDTOs — NEVER the full Question rows.
 * Strips correctAnswer / explanation / hint to prevent pre-submit leakage.
 *
 * Query params:
 *   subjectId, unitNumber, difficulty, topicId, mode=exam|practice, limit
 *
 * In exam mode, hint is also stripped via toExamDTO(). Default: practice DTO.
 */
export async function GET(req: NextRequest) {
  return withApi(async () => {
    await requireUser()
    const sp = req.nextUrl.searchParams
    const subjectId = sp.get('subjectId')
    const unitNumber = sp.get('unitNumber')
    const difficulty = sp.get('difficulty')
    const topicId = sp.get('topicId')
    const mode = sp.get('mode') || 'practice'
    const limit = Math.min(parseInt(sp.get('limit') || '50', 10) || 50, 100)

    const where: Record<string, unknown> = {}
    if (subjectId) where.subjectId = subjectId
    if (unitNumber) where.unitNumber = parseInt(unitNumber, 10)
    if (difficulty && difficulty !== 'all') where.difficulty = difficulty
    if (topicId) where.topicId = topicId

    const questions = await db.question.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    // Always strip answer-bearing fields before sending to the browser.
    if (mode === 'exam') {
      // toExamDTO is imported lazily to keep this route focused; practice DTO
      // is the default and strips hint + explanation + correctAnswer.
      const { toExamDTO } = await import('@/lib/questions')
      return okResponse(questions.map(toExamDTO))
    }
    return okResponse(questions.map(toPracticeDTO))
  })
}

import { NextRequest } from 'next/server'
import { ApiError, okResponse, requireUser, withApi } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  getStudentLearningScope,
  hasResolvedLearningScope,
  scopedQuestionWhere,
} from '@/features/learning/server/get-student-learning-scope'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/questions/[id]/hint
 *
 * Reveal only the hint for a question that belongs to the authenticated
 * student's current learning scope. Correct answers and explanations remain
 * server-only until the answer is submitted for scoring.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  return withApi(async () => {
    const user = await requireUser()
    const { id } = await ctx.params
    const scope = await getStudentLearningScope(user.id)

    if (!scope || !hasResolvedLearningScope(scope)) {
      throw new ApiError('NOT_FOUND', 'Question not found.', 404, false)
    }

    const question = await db.question.findFirst({
      where: {
        id,
        ...scopedQuestionWhere(scope),
      },
      select: {
        id: true,
        hint: true,
      },
    })

    if (!question) {
      throw new ApiError('NOT_FOUND', 'Question not found.', 404, false)
    }

    const hint = question.hint?.trim() || null
    return okResponse({
      questionId: question.id,
      hint,
      available: Boolean(hint),
    })
  })
}

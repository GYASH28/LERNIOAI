import { NextRequest } from 'next/server'
import { canAttemptDatabase } from '@/lib/db-health'
import { withApi, okResponse, getCurrentUser } from '@/lib/auth'
import { DEMO_SUBJECTS, isDemoMode } from '@/lib/demo-fixtures'
import { getStudentLearningScope } from '@/features/learning/server/get-student-learning-scope'

/**
 * GET /api/academics
 * Returns the academic hierarchy (subjects to units to topics to lessons).
 * Public read-only syllabus data; signed-in users may receive institution-specific additions.
 * Optional ?subjectId= to fetch a single subject.
 */
export async function GET(req: NextRequest) {
  return withApi(async () => {
    const sp = req.nextUrl.searchParams
    const subjectId = sp.get('subjectId')
    if (isDemoMode()) {
      return okResponse(subjectId ? DEMO_SUBJECTS.find((s) => s.id === subjectId) ?? null : DEMO_SUBJECTS)
    }
    if (!(await canAttemptDatabase())) {
      const fallbackData = subjectId ? null : []
      return Response.json(
        { ok: true, data: fallbackData, requestId: crypto.randomUUID(), degraded: true },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    }

    const authUser = await getCurrentUser()
    if (!authUser) {
      return Response.json(
        { ok: true, data: subjectId ? null : [], requestId: crypto.randomUUID() },
        { headers: { 'Cache-Control': 'private, no-store' } },
      )
    }

    const learningScope = await getStudentLearningScope(authUser.id, { subjectId })
    const subjects = learningScope?.subjects ?? []
    const headers = { 'Cache-Control': 'private, no-store' }

    if (subjectId) {
      return Response.json({ ok: true, data: subjects[0] ?? null, requestId: crypto.randomUUID() }, { headers })
    }
    return Response.json({ ok: true, data: subjects, requestId: crypto.randomUUID() }, { headers })
  })
}

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, withApi, okResponse } from '@/lib/auth'
import { DEMO_SUBJECTS, isDemoMode } from '@/lib/demo-fixtures'

/**
 * GET /api/academics
 * Returns the academic hierarchy (subjects → units → topics → lessons).
 * Authenticated only — every user reads the same published curriculum.
 * Optional ?subjectId= to fetch a single subject.
 */
export async function GET(req: NextRequest) {
  return withApi(async () => {
    const sp = req.nextUrl.searchParams
    const subjectId = sp.get('subjectId')
    if (isDemoMode()) {
      return okResponse(subjectId ? DEMO_SUBJECTS.find((s) => s.id === subjectId) ?? null : DEMO_SUBJECTS)
    }

    // Publicly accessible read-only syllabus
    const subjects = await db.subject.findMany({
      where: subjectId ? { id: subjectId } : {},
      include: {
        units: {
          orderBy: { number: 'asc' },
          include: {
            topics: { orderBy: { title: 'asc' } },
            lessons: { orderBy: { order: 'asc' } },
          },
        },
      },
      orderBy: { code: 'asc' },
    })

    if (subjectId) {
      return okResponse(subjects[0] ?? null)
    }
    return okResponse(subjects)
  })
}

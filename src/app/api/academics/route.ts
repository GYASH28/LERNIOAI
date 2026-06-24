import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { withApi, okResponse } from '@/lib/auth'
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
              where: { status: 'published' },
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

    const headers = { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' }
    if (subjectId) {
      return Response.json({ ok: true, data: subjects[0] ?? null, requestId: crypto.randomUUID() }, { headers })
    }
    return Response.json({ ok: true, data: subjects, requestId: crypto.randomUUID() }, { headers })
  })
}

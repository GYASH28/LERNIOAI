import { NextRequest } from 'next/server'
import type { Prisma } from '@prisma/client'
import { requireUser, withApi, okResponse } from '@/lib/auth'
import { db } from '@/lib/db'
import { studentLessonResourceWhere } from '@/lib/resources/student-publication-policy'
import {
  getStudentLearningScope,
  hasResolvedLearningScope,
  scopedLessonWhere,
  scopedResourceWhere,
  type StudentLearningScope,
} from '@/features/learning/server/get-student-learning-scope'
import {
  buildLearningResourceSearchResult,
  buildLearningSearchResults,
  type LearningSearchResult,
} from '@/features/learning/utils/learning-search'

export async function GET(req: NextRequest) {
  return withApi(async () => {
    const user = await requireUser()
    const query = req.nextUrl.searchParams.get('q') ?? ''
    const limit = clampLimit(req.nextUrl.searchParams.get('limit'))
    const scope = await getStudentLearningScope(user.id)

    if (!hasResolvedLearningScope(scope) || query.trim().length < 2) {
      return privateResponse({ results: [] as LearningSearchResult[] })
    }

    const curriculumResults = buildLearningSearchResults(scope, query, { limit })
    const remaining = Math.max(0, limit - curriculumResults.length)
    const resourceResults = remaining > 0
      ? await searchScopedResources({ query, limit: remaining, scope })
      : []

    return privateResponse({
      results: [...curriculumResults, ...resourceResults]
        .sort((a, b) => b.score - a.score || a.kind.localeCompare(b.kind) || a.title.localeCompare(b.title))
        .slice(0, limit),
    })
  })
}

async function searchScopedResources(input: {
  query: string
  limit: number
  scope: ResolvedStudentLearningScope
}): Promise<LearningSearchResult[]> {
  const { query, scope } = input
  const resourceWhere: Prisma.ResourceWhereInput = {
    AND: [
      scopedResourceWhere(scope),
      {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { type: { contains: query, mode: 'insensitive' } },
          { provider: { contains: query, mode: 'insensitive' } },
          { canonicalUrl: { contains: query, mode: 'insensitive' } },
          { url: { contains: query, mode: 'insensitive' } },
        ],
      },
    ],
  }

  const resources = await db.resource.findMany({
    where: resourceWhere,
    orderBy: [{ qualityScore: 'desc' }, { createdAt: 'desc' }],
    take: input.limit * 2,
    select: {
      id: true,
      title: true,
      type: true,
      canonicalUrl: true,
      url: true,
      provider: true,
      subjectId: true,
      unitNumber: true,
      subject: { select: { code: true, name: true } },
      lessonResources: {
        where: {
          ...studentLessonResourceWhere(),
          lesson: scopedLessonWhere(scope),
        },
        orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
        take: 1,
        select: {
          role: true,
          lesson: {
            select: {
              id: true,
              title: true,
              order: true,
              unit: {
                select: {
                  number: true,
                  subject: { select: { code: true } },
                },
              },
              topic: {
                select: {
                  title: true,
                  unit: {
                    select: {
                      number: true,
                      subject: { select: { code: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  return resources
    .map((resource) =>
      buildLearningResourceSearchResult({
        query,
        programmeCode: scope.programme.code,
        semesterNumber: scope.semester.number,
        resource: {
          ...resource,
          lessonResource: resource.lessonResources[0] ?? null,
        },
      }),
    )
    .filter((result): result is LearningSearchResult => Boolean(result))
    .slice(0, input.limit)
}

type ResolvedStudentLearningScope = StudentLearningScope & {
  institution: NonNullable<StudentLearningScope['institution']>
  department: NonNullable<StudentLearningScope['department']>
  programme: NonNullable<StudentLearningScope['programme']>
  scheme: NonNullable<StudentLearningScope['scheme']>
  semester: NonNullable<StudentLearningScope['semester']>
}

function clampLimit(value: string | null): number {
  const parsed = Number.parseInt(value || '', 10)
  if (!Number.isInteger(parsed)) return 12
  return Math.max(1, Math.min(parsed, 25))
}

function privateResponse<T>(data: T) {
  const response = okResponse(data)
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}

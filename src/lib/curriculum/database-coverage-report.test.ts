import { describe, expect, it, vi } from 'vitest'
import {
  buildDatabaseLearningCoverageSnapshot,
  type DatabaseCoverageClient,
} from './database-coverage-report'

describe('database learning coverage report', () => {
  it('counts only published student-visible coverage and marks missing live scopes', async () => {
    const db = databaseMock()

    const snapshot = await buildDatabaseLearningCoverageSnapshot({
      db,
      generatedAt: '2026-06-29T00:00:00.000Z',
    })

    expect(db.academicScheme.findMany).toHaveBeenCalledWith({
      where: {
        code: 'R23',
        status: { in: ['published'] },
        archivedAt: null,
        programme: {
          code: { in: ['DCOMP', 'DCIOT'] },
          status: 'active',
          archivedAt: null,
          department: {
            code: { in: ['COMP', 'CIOT'] },
            status: 'active',
            archivedAt: null,
          },
        },
      },
      orderBy: [{ startYear: 'desc' }, { createdAt: 'desc' }],
      select: expect.any(Object),
    })

    const comp = snapshot.programmes.find((programme) => programme.programme === 'DCOMP')
    expect(comp?.semesters[0]).toMatchObject({
      status: 'published_scheme_present',
      schemeId: 'scheme_dcomp_r23',
      semesterId: 'semester_1',
      subjects: 1,
      units: 2,
      topics: 3,
      lessons: 4,
      approvedLessonResources: 5,
      approvedGeneratedDocuments: 6,
      publishedResources: 10,
      brokenResources: 10,
      publishedQuestions: 11,
      publishedPracticalExperiments: 8,
      publishedCodingChallenges: 9,
      pendingReviewItems: 28,
      subjectCodes: ['R23CP1401'],
    })
    expect(comp?.semesters[1]).toMatchObject({
      semester: 2,
      status: 'missing_semester',
      pendingReviewItems: 1,
    })

    const ciot = snapshot.programmes.find((programme) => programme.programme === 'DCIOT')
    expect(ciot?.semesters[0]).toMatchObject({
      status: 'missing_published_scheme',
      pendingReviewItems: 1,
    })
    expect(snapshot.totals).toMatchObject({
      programmes: 2,
      semesters: 12,
      publishedSchemes: 1,
      subjects: 1,
      lessons: 4,
      lessonsWithPrimaryVideo: 4,
      lessonsWithApprovedHtmlNotes: 4,
      lessonsWithApprovedPdf: 4,
      pendingReviewItems: 39,
    })

    expect(db.lesson.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        status: { in: ['published', 'verified'] },
        archivedAt: null,
        OR: expect.any(Array),
      }),
    })
    expect(db.lessonResource.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        status: { in: ['published', 'verified', 'approved'] },
        verificationStatus: { in: ['verified', 'approved'] },
        resource: expect.objectContaining({
          visibility: { in: ['public', 'published'] },
          verified: true,
          moderationStatus: 'clear',
          archivedAt: null,
        }),
      }),
    })
  })
})

function databaseMock(): DatabaseCoverageClient {
  return {
    academicScheme: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'scheme_dcomp_r23',
          code: 'R23',
          name: 'R23',
          status: 'published',
          programme: {
            id: 'programme_dcomp',
            code: 'DCOMP',
            department: { code: 'COMP' },
          },
          semesters: [
            {
              id: 'semester_1',
              number: 1,
              name: 'Semester 1',
            },
          ],
        },
      ]),
    },
    subject: {
      findMany: vi.fn().mockResolvedValue([{ code: 'R23CP1401' }]),
      count: vi.fn().mockResolvedValue(1),
    },
    unit: {
      count: vi.fn().mockResolvedValue(2),
    },
    topic: {
      count: vi.fn().mockResolvedValue(3),
    },
    lesson: {
      count: vi.fn().mockResolvedValue(4),
    },
    lessonResource: {
      count: vi.fn().mockResolvedValue(5),
    },
    generatedLessonDocument: {
      count: vi.fn().mockResolvedValue(6),
    },
    contentGenerationJob: {
      count: vi.fn().mockResolvedValue(7),
    },
    practicalExperiment: {
      count: vi.fn().mockResolvedValue(8),
    },
    codingChallenge: {
      count: vi.fn().mockResolvedValue(9),
    },
    resource: {
      count: vi.fn().mockResolvedValue(10),
    },
    question: {
      count: vi.fn().mockResolvedValue(11),
    },
  }
}

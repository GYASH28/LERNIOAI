import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { requireUserMock, withApiMock } = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  withApiMock: vi.fn((handler) => handler()),
}))

vi.mock('@/lib/auth', () => ({
  requireUser: requireUserMock,
  withApi: withApiMock,
  ApiError: class ApiError extends Error {
    constructor(
      public code: string,
      public safeMessage: string,
      public status: number = 500,
      public retryable: boolean = true,
    ) {
      super(safeMessage)
    }
  },
}))

const {
  getStudentLearningScopeMock,
  hasResolvedLearningScopeMock,
  scopedLessonWhereMock,
} = vi.hoisted(() => ({
  getStudentLearningScopeMock: vi.fn(),
  hasResolvedLearningScopeMock: vi.fn(),
  scopedLessonWhereMock: vi.fn(),
}))

vi.mock('@/features/learning/server/get-student-learning-scope', () => ({
  getStudentLearningScope: getStudentLearningScopeMock,
  hasResolvedLearningScope: hasResolvedLearningScopeMock,
  scopedLessonWhere: scopedLessonWhereMock,
}))

const dbMock = vi.hoisted(() => ({
  generatedLessonDocument: {
    findFirst: vi.fn(),
  },
}))

vi.mock('@/lib/db', () => ({
  db: dbMock,
}))

import { GET } from './route'

describe('GET /api/learning/notes/[documentId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    requireUserMock.mockResolvedValue({ id: 'user_1' })
    getStudentLearningScopeMock.mockResolvedValue({ scope: 'resolved' })
    hasResolvedLearningScopeMock.mockReturnValue(true)
    scopedLessonWhereMock.mockReturnValue({ id: { in: ['lesson_1'] } })
    dbMock.generatedLessonDocument.findFirst.mockResolvedValue(documentFixture())
  })

  it('redirects an in-scope HTML artifact through a signed storage URL', async () => {
    vi.stubEnv('STORAGE_PUBLIC_BASE_URL', 'https://cdn.example.test/private')
    vi.stubEnv('STORAGE_SIGNING_SECRET', 'secret-value')
    vi.stubEnv('STORAGE_SIGNED_URL_TTL_SECONDS', '300')

    const response = await GET(
      new NextRequest('http://localhost/api/learning/notes/doc_1?format=html'),
      { params: Promise.resolve({ documentId: 'doc_1' }) },
    )

    expect(response.status).toBe(302)
    const location = response.headers.get('location')
    expect(location).toContain('https://cdn.example.test/private/lesson-notes/doc.html')
    expect(location).toContain('signature=')
    expect(location).not.toContain('secret-value')
    expect(dbMock.generatedLessonDocument.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: 'doc_1',
        lesson: { id: { in: ['lesson_1'] } },
      }),
      select: expect.any(Object),
    })
  })

  it('uses the PDF storage key for attachment redirects', async () => {
    vi.stubEnv('STORAGE_PUBLIC_BASE_URL', 'https://cdn.example.test')
    vi.stubEnv('STORAGE_SIGNING_SECRET', 'secret-value')

    const response = await GET(
      new NextRequest('http://localhost/api/learning/notes/doc_1?format=pdf'),
      { params: Promise.resolve({ documentId: 'doc_1' }) },
    )

    expect(response.status).toBe(302)
    const location = new URL(response.headers.get('location')!)
    expect(location.pathname).toBe('/lesson-notes/doc.pdf')
    expect(location.searchParams.get('disposition')).toBe('attachment')
  })

  it('fails closed when storage is not configured', async () => {
    await expect(GET(
      new NextRequest('http://localhost/api/learning/notes/doc_1?format=html'),
      { params: Promise.resolve({ documentId: 'doc_1' }) },
    )).rejects.toThrow('Generated note storage is not configured.')
  })

  it('returns not found when the learning scope is unresolved', async () => {
    hasResolvedLearningScopeMock.mockReturnValue(false)

    await expect(GET(
      new NextRequest('http://localhost/api/learning/notes/doc_1?format=html'),
      { params: Promise.resolve({ documentId: 'doc_1' }) },
    )).rejects.toThrow('Generated note not found.')
    expect(dbMock.generatedLessonDocument.findFirst).not.toHaveBeenCalled()
  })
})

function documentFixture() {
  return {
    id: 'doc_1',
    documentType: 'lesson_notes',
    version: 2,
    htmlObjectKey: 'lesson-notes/doc.html',
    storageObjectKey: 'lesson-notes/doc.pdf',
    outputResource: null,
  }
}

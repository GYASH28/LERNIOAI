import { beforeEach, describe, expect, it, vi } from 'vitest'

const { okResponseMock, withApiMock, parseBodyMock, accessMock } = vi.hoisted(() => ({
  okResponseMock: vi.fn((data) => ({ ok: true, data })),
  withApiMock: vi.fn((handler) => handler()),
  parseBodyMock: vi.fn(),
  accessMock: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  okResponse: okResponseMock,
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

vi.mock('@/lib/schemas', () => ({
  parseBody: parseBodyMock,
}))

vi.mock('@/lib/learning/learning-ops-authority', () => ({
  requireLearningOpsPreviewAccess: accessMock,
}))

const dbMock = vi.hoisted(() => {
  const value = {
    lesson: {
      findUnique: vi.fn(),
    },
    contentGenerationJob: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    auditEvent: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  }
  value.$transaction.mockImplementation((callback: (tx: typeof value) => unknown) => callback(value))
  return value
})

vi.mock('@/lib/db', () => ({
  db: dbMock,
}))

import { GET, POST } from './route'

describe('/api/admin/learning/notes/jobs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dbMock.$transaction.mockImplementation((callback: (tx: typeof dbMock) => unknown) => callback(dbMock))
    accessMock.mockResolvedValue(accessFixture())
    parseBodyMock.mockResolvedValue({
      lessonId: 'lesson_1',
      documentType: 'lesson_notes',
      templateVersion: 'lesson-notes-v1',
      forceNew: false,
    })
    dbMock.lesson.findUnique.mockResolvedValue(lessonFixture())
    dbMock.contentGenerationJob.findFirst.mockResolvedValue(null)
    dbMock.contentGenerationJob.create.mockResolvedValue(jobFixture())
    dbMock.auditEvent.create.mockResolvedValue({ id: 'audit_1' })
  })

  it('queues an audited generation job for an in-scope published lesson', async () => {
    const result = await POST(new Request('http://localhost/api/admin/learning/notes/jobs', { method: 'POST' }))

    expect(result).toEqual({ ok: true, data: { job: jobFixture(), reused: false } })
    expect(dbMock.contentGenerationJob.create).toHaveBeenCalledWith({
      data: {
        lessonId: 'lesson_1',
        jobType: 'lesson_notes',
        templateVersion: 'lesson-notes-v1',
        state: 'queued',
        requestedById: 'reviewer_1',
      },
      select: expect.any(Object),
    })
    expect(dbMock.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: 'reviewer_1',
        action: 'lesson_note.generation_queued',
        entityType: 'ContentGenerationJob',
        entityId: 'job_1',
      }),
    })
  })

  it('reuses an active generation job unless forceNew is requested', async () => {
    dbMock.contentGenerationJob.findFirst.mockResolvedValue(jobFixture({ id: 'existing_job' }))

    const result = await POST(new Request('http://localhost/api/admin/learning/notes/jobs', { method: 'POST' }))

    expect(result).toEqual({ ok: true, data: { job: jobFixture({ id: 'existing_job' }), reused: true } })
    expect(dbMock.contentGenerationJob.create).not.toHaveBeenCalled()
  })

  it('rejects lessons outside the reviewer subject scope', async () => {
    dbMock.lesson.findUnique.mockResolvedValue(lessonFixture({ subjectId: 'subject_2' }))

    await expect(POST(new Request('http://localhost/api/admin/learning/notes/jobs', { method: 'POST' }))).rejects.toThrow(
      'This lesson is outside your learning-operations scope.',
    )
    expect(dbMock.contentGenerationJob.create).not.toHaveBeenCalled()
  })

  it('lists scoped generation jobs', async () => {
    dbMock.contentGenerationJob.findMany.mockResolvedValue([jobFixture()])

    const result = await GET(new Request('http://localhost/api/admin/learning/notes/jobs?state=queued&take=10'))

    expect(result).toEqual({ ok: true, data: { jobs: [jobFixture()] } })
    expect(dbMock.contentGenerationJob.findMany).toHaveBeenCalledWith({
      where: {
        AND: [
          { jobType: { in: ['lesson_notes', 'quick_notes', 'revision_sheet', 'formula_sheet'] } },
          { state: 'queued' },
          {},
          {
            lesson: {
              OR: [
                { unit: { subjectId: { in: ['subject_1'] } } },
                { topic: { unit: { subjectId: { in: ['subject_1'] } } } },
              ],
            },
          },
        ],
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: 10,
      select: expect.any(Object),
    })
  })
})

function accessFixture() {
  return {
    subjectIds: ['subject_1'],
    authority: {
      user: { id: 'reviewer_1' },
      activeRoles: ['reviewer'],
      capabilities: ['ai.content_draft'],
    },
  }
}

function lessonFixture(overrides: { subjectId?: string; status?: string } = {}) {
  return {
    id: 'lesson_1',
    title: 'Structure of a C Program',
    status: overrides.status ?? 'published',
    unit: { subjectId: overrides.subjectId ?? 'subject_1' },
    topic: null,
  }
}

function jobFixture(overrides: { id?: string } = {}) {
  return {
    id: overrides.id ?? 'job_1',
    lessonId: 'lesson_1',
    jobType: 'lesson_notes',
    state: 'queued',
    attemptCount: 0,
    provider: null,
    model: null,
    templateVersion: 'lesson-notes-v1',
  }
}

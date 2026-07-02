import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LessonNoteDocument } from './lesson-note-document'

const dbMock = vi.hoisted(() => {
  const value = {
    contentGenerationJob: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    lesson: {
      findUnique: vi.fn(),
    },
    generatedLessonDocument: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
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

import {
  claimNextContentGenerationJob,
  processClaimedContentGenerationJob,
  validateGeneratedLessonNoteDocument,
  type LessonNoteGenerationInput,
  type LessonNoteGenerationProvider,
  type LessonNoteArtifactStore,
} from './generation-worker'

const now = new Date('2026-06-29T10:00:00.000Z')

describe('lesson note generation worker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dbMock.$transaction.mockImplementation((callback: (tx: typeof dbMock) => unknown) => callback(dbMock))
    dbMock.contentGenerationJob.update.mockResolvedValue({ id: 'job_1' })
    dbMock.generatedLessonDocument.findFirst.mockResolvedValue(null)
    dbMock.generatedLessonDocument.create.mockResolvedValue({ id: 'doc_1' })
    dbMock.auditEvent.create.mockResolvedValue({ id: 'audit_1' })
  })

  it('claims the oldest queued job with a lease and attempt increment', async () => {
    dbMock.contentGenerationJob.findFirst.mockResolvedValue({
      ...jobFixture(),
      attemptCount: 0,
      state: 'queued',
    })
    dbMock.contentGenerationJob.update.mockResolvedValue({
      ...jobFixture(),
      attemptCount: 1,
      state: 'running',
      leaseOwner: 'worker-a',
    })

    const claimed = await claimNextContentGenerationJob({
      leaseOwner: 'worker-a',
      leaseMs: 60_000,
      now,
    })

    expect(claimed?.state).toBe('running')
    expect(dbMock.contentGenerationJob.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        state: { in: ['queued', 'validation_failed'] },
        attemptCount: { lt: 3 },
      }),
    }))
    expect(dbMock.contentGenerationJob.update).toHaveBeenCalledWith({
      where: { id: 'job_1' },
      data: expect.objectContaining({
        state: 'running',
        attemptCount: { increment: 1 },
        leaseOwner: 'worker-a',
        leaseUntil: new Date('2026-06-29T10:01:00.000Z'),
      }),
      select: expect.any(Object),
    })
  })

  it('generates review-ready HTML and never self-publishes a document', async () => {
    dbMock.lesson.findUnique.mockResolvedValue(lessonFixture())
    const provider = providerFixture()
    const artifactStore = artifactStoreFixture()
    const result = await processClaimedContentGenerationJob(jobFixture(), {
      provider,
      artifactStore,
      now,
    })

    expect(result).toEqual({
      status: 'awaiting_review',
      jobId: 'job_1',
      generatedDocumentId: 'doc_1',
      htmlObjectKey: 'lesson-notes/dcomp__sem-2__r23cp1401__unit-1__1-structure-of-a-c-program--lesson_1__v1__lesson_notes.html',
    })
    expect(provider.generate).toHaveBeenCalledWith(expect.objectContaining({
      documentType: 'lesson_notes',
      targetVersion: 1,
      allowedSourceIds: expect.arrayContaining([
        'official-curriculum:R23CP1401',
        'approved-resource:resource_1',
      ]),
    }), undefined)
    expect(artifactStore.putText).toHaveBeenCalledWith(expect.objectContaining({
      contentType: 'text/html; charset=utf-8',
      body: expect.stringContaining('<!doctype html>'),
    }))
    expect(dbMock.generatedLessonDocument.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        lessonId: 'lesson_1',
        documentType: 'lesson_notes',
        generationStatus: 'ready_for_review',
        reviewerId: null,
        publisherId: null,
        publishedAt: null,
        htmlObjectKey: expect.stringContaining('.html'),
      }),
      select: { id: true },
    })
    expect(dbMock.contentGenerationJob.update).toHaveBeenLastCalledWith({
      where: { id: 'job_1' },
      data: expect.objectContaining({
        state: 'awaiting_review',
        generatedDocumentId: 'doc_1',
        leaseOwner: null,
        leaseUntil: null,
      }),
      select: { id: true },
    })
  })

  it('blocks generated documents that try to self-publish', async () => {
    const input = generationInputFixture()
    const document = validDocument(input)
    const result = validateGeneratedLessonNoteDocument({
      ...document,
      verificationStatus: 'published',
    }, input)

    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.errors).toContain('Generated documents cannot self-approve or self-publish.')
    }
  })

  it('marks a job validation_failed when generated metadata does not match the lesson', async () => {
    dbMock.lesson.findUnique.mockResolvedValue(lessonFixture())
    const provider = providerFixture((input) => ({
      ...validDocument(input),
      subjectCode: 'WRONG',
    }))
    const artifactStore = artifactStoreFixture()

    const result = await processClaimedContentGenerationJob(jobFixture(), {
      provider,
      artifactStore,
      now,
    })

    expect(result.status).toBe('validation_failed')
    expect(artifactStore.putText).not.toHaveBeenCalled()
    expect(dbMock.contentGenerationJob.update).toHaveBeenLastCalledWith({
      where: { id: 'job_1' },
      data: expect.objectContaining({
        state: 'validation_failed',
        errorCode: 'VALIDATION_FAILED',
        errorMessage: expect.stringContaining('subject does not match'),
        leaseOwner: null,
        leaseUntil: null,
      }),
      select: { id: true },
    })
  })

  it('requeues retryable provider failures with backoff', async () => {
    dbMock.lesson.findUnique.mockResolvedValue(lessonFixture())
    const provider: LessonNoteGenerationProvider = {
      provider: 'test-provider',
      model: 'test-model',
      generate: vi.fn(async () => {
        throw new Error('Provider timeout')
      }),
    }

    const result = await processClaimedContentGenerationJob(jobFixture({ attemptCount: 1 }), {
      provider,
      artifactStore: artifactStoreFixture(),
      maxAttempts: 3,
      now,
    })

    expect(result).toEqual({
      status: 'requeued',
      jobId: 'job_1',
      errorMessage: 'Error: Provider timeout',
      nextAttemptAfter: new Date('2026-06-29T10:00:30.000Z'),
    })
    expect(dbMock.contentGenerationJob.update).toHaveBeenLastCalledWith({
      where: { id: 'job_1' },
      data: expect.objectContaining({
        state: 'queued',
        errorCode: 'GENERATION_RETRYABLE_ERROR',
        leaseOwner: null,
        leaseUntil: new Date('2026-06-29T10:00:30.000Z'),
      }),
      select: { id: true },
    })
  })
})

function jobFixture(overrides: Partial<{
  id: string
  lessonId: string
  jobType: string
  state: string
  attemptCount: number
  provider: string | null
  model: string | null
  templateVersion: string | null
  generatedDocumentId: string | null
  requestedById: string | null
}> = {}) {
  return {
    id: 'job_1',
    lessonId: 'lesson_1',
    jobType: 'lesson_notes',
    state: 'running',
    attemptCount: 1,
    provider: null,
    model: null,
    templateVersion: 'lesson-notes-v1',
    generatedDocumentId: null,
    requestedById: 'reviewer_1',
    ...overrides,
  }
}

function providerFixture(
  makeDocument: (input: LessonNoteGenerationInput) => LessonNoteDocument = validDocument,
): LessonNoteGenerationProvider {
  return {
    provider: 'test-provider',
    model: 'test-model',
    generate: vi.fn(async (input: LessonNoteGenerationInput) => ({
      document: makeDocument(input),
      provider: 'test-provider',
      model: 'test-model',
    })),
  }
}

function artifactStoreFixture(): LessonNoteArtifactStore {
  return {
    putText: vi.fn(async (input) => ({ objectKey: input.key })),
  }
}

function generationInputFixture(): LessonNoteGenerationInput {
  return {
    jobId: 'job_1',
    lesson: {
      id: 'lesson_1',
      title: 'Structure of a C Program',
      status: 'published',
      order: 1,
      durationMin: 20,
      slug: '1-structure-of-a-c-program--lesson_1',
      deepLink: 'http://localhost:3000/learn/DCOMP/semester/2/subject/R23CP1401/lesson/1-structure-of-a-c-program--lesson_1',
    },
    programme: { code: 'DCOMP' },
    semester: { number: 2 },
    subject: {
      id: 'subject_1',
      code: 'R23CP1401',
      name: 'Programming in C',
      sourceEvidence: 'Official curriculum page 11',
    },
    unit: {
      id: 'unit_1',
      number: 1,
      title: 'C Basics',
      outcomes: 'Understand structure of C programs.',
      sourceEvidence: 'Official curriculum page 12',
    },
    topic: null,
    documentType: 'lesson_notes',
    targetVersion: 1,
    templateVersion: 'lesson-notes-v1',
    courseOutcomes: [
      {
        code: 'CO1',
        text: 'Write simple C programs.',
        sourceEvidence: 'Official curriculum page 12',
      },
    ],
    approvedResources: [
      {
        id: 'resource_1',
        role: 'primary_video',
        title: 'C Program Structure',
        type: 'video_link',
        url: 'https://www.youtube.com/watch?v=abc123',
        canonicalUrl: null,
        provider: 'youtube',
        creator: 'CWIT',
        durationSeconds: 600,
        language: 'en',
        coveragePercentage: 80,
        transcriptSnippets: ['A C program starts with header files and main function.'],
      },
    ],
    references: [
      {
        id: 'ref_1',
        title: 'Programming in ANSI C',
        author: 'E Balagurusamy',
        url: null,
        sourceEvidence: 'Official reference list',
      },
    ],
    allowedSourceIds: [
      'official-curriculum:R23CP1401',
      'official-unit:R23CP1401:1',
      'approved-resource:resource_1',
      'approved-reference:ref_1',
    ],
    sourceHash: 'source_hash',
  }
}

function validDocument(input: LessonNoteGenerationInput): LessonNoteDocument {
  return {
    documentType: input.documentType,
    templateVersion: input.templateVersion,
    verificationStatus: 'draft',
    programmeCode: input.programme.code,
    semesterNumber: input.semester.number,
    subjectCode: input.subject.code,
    unitNumber: input.unit.number,
    lessonSlug: input.lesson.slug,
    lessonTitle: input.lesson.title,
    version: input.targetVersion,
    deepLink: input.lesson.deepLink,
    learningOutcomes: ['Explain the structure of a simple C program.'],
    prerequisites: [],
    sections: [
      {
        id: 'overview',
        title: 'Overview',
        body: 'A simple C program is organised around headers, declarations and the main function.',
        citationIds: ['official-curriculum:R23CP1401'],
      },
    ],
    workedExamples: [],
    commonMistakes: ['Forgetting the semicolon after a statement.'],
    examTips: ['Label each part of the program structure clearly.'],
    practiceSet: [],
    glossary: [{ term: 'main', definition: 'The entry point function of a C program.' }],
    sources: [
      {
        id: 'official-curriculum:R23CP1401',
        label: 'Official curriculum page 11',
        sourceType: 'official_curriculum',
      },
    ],
  }
}

function lessonFixture() {
  return {
    id: 'lesson_1',
    title: 'Structure of a C Program',
    order: 1,
    durationMin: 20,
    status: 'published',
    unit: {
      id: 'unit_1',
      number: 1,
      title: 'C Basics',
      outcomes: 'Understand structure of C programs.',
      sourceEvidence: 'Official curriculum page 12',
      subject: subjectFixture(),
    },
    topic: null,
    resources: [
      {
        id: 'lesson_resource_1',
        role: 'primary_video',
        coveragePercentage: 80,
        resource: {
          id: 'resource_1',
          title: 'C Program Structure',
          type: 'video_link',
          url: 'https://www.youtube.com/watch?v=abc123',
          canonicalUrl: null,
          provider: 'youtube',
          creator: 'CWIT',
          durationSeconds: 600,
          language: 'en',
          content: null,
          videoChapters: [
            { transcriptSnippet: 'A C program starts with header files and main function.' },
          ],
        },
      },
    ],
  }
}

function subjectFixture() {
  return {
    id: 'subject_1',
    code: 'R23CP1401',
    name: 'Programming in C',
    sourceEvidence: 'Official curriculum page 11',
    semester: { number: 2 },
    scheme: { programme: { code: 'DCOMP' } },
    courseOutcomes: [
      {
        code: 'CO1',
        text: 'Write simple C programs.',
        order: 1,
        status: 'active',
        sourceEvidence: 'Official curriculum page 12',
      },
    ],
    recommendedReferences: [
      {
        id: 'ref_1',
        title: 'Programming in ANSI C',
        author: 'E Balagurusamy',
        url: null,
        status: 'active',
        sourceEvidence: 'Official reference list',
      },
    ],
  }
}

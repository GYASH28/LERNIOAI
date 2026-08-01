import { describe, expect, it, vi } from 'vitest'
import {
  promoteYouTubeCandidateMappings,
  type YouTubeCandidatePromotionDb,
} from './youtube-candidate-promotion'

describe('promoteYouTubeCandidateMappings', () => {
  it('approves a verified direct video into Resource and LessonResource rows', async () => {
    const db = promotionDbMock()

    const result = await promoteYouTubeCandidateMappings({
      reviewQueue: queueFixture(),
      decisions: {
        decisions: [
          {
            candidateId: 'ytcand_ready',
            subjectCode: 'R23CP1401',
            lessonId: 'lesson_1',
            decision: 'approve',
            role: 'primary_video',
            sourceEvidence: 'Reviewer watched the video and matched it to Unit 1 lesson outcomes.',
            coveragePercentage: 90,
            isRequired: true,
          },
        ],
      },
      actorUserId: 'reviewer_1',
      allowedSubjectIds: ['subject_1'],
      db,
    })

    expect(result).toEqual({
      dryRun: false,
      promoted: [
        {
          candidateId: 'ytcand_ready',
          subjectCode: 'R23CP1401',
          lessonId: 'lesson_1',
          decision: 'approve',
          resourceId: 'resource_1',
          lessonResourceId: 'lesson_resource_1',
          status: 'written',
        },
      ],
    })
    expect(db.resource.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: 'Structure of a C Program',
        type: 'video_link',
        provider: 'youtube',
        canonicalUrl: 'https://www.youtube.com/watch?v=abc123',
        visibility: 'published',
        verified: true,
        reviewStatus: 'approved',
        subject: { connect: { id: 'subject_1' } },
      }),
      select: expect.any(Object),
    })
    expect(db.lessonResource.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        lessonId: 'lesson_1',
        resourceId: 'resource_1',
        role: 'primary_video',
        status: 'approved',
        verificationStatus: 'verified',
        isPrimary: true,
        coveragePercentage: 90,
      }),
      select: expect.any(Object),
    })
    expect(db.lessonResource.updateMany).toHaveBeenCalledWith({
      where: {
        lessonId: 'lesson_1',
        role: 'primary_video',
        id: { not: 'lesson_resource_1' },
      },
      data: { isPrimary: false },
    })
    expect(db.resourceReview.create).toHaveBeenCalled()
    expect(db.reviewDecision.create).toHaveBeenCalled()
    expect(db.auditEvent.create).toHaveBeenCalledTimes(2)
  })

  it('rejects blocked subject mappings before database writes', async () => {
    const db = promotionDbMock()

    await expect(promoteYouTubeCandidateMappings({
      reviewQueue: queueFixture({ mappingStatus: 'blocked_missing_lesson_structure' }),
      decisions: {
        decisions: [
          {
            candidateId: 'ytcand_ready',
            subjectCode: 'R23CP1401',
            lessonId: 'lesson_1',
            decision: 'draft',
          },
        ],
      },
      actorUserId: 'reviewer_1',
      db,
    })).rejects.toThrow('This candidate is blocked until verified lesson structure exists.')

    expect(db.subject.findFirst).not.toHaveBeenCalled()
    expect(db.resource.create).not.toHaveBeenCalled()
  })

  it('does not approve playlist candidates as final lesson mappings', async () => {
    const db = promotionDbMock()

    await expect(promoteYouTubeCandidateMappings({
      reviewQueue: queueFixture({
        resourceKind: 'playlist',
        metadataStatus: 'not_supported_for_playlist',
        embeddable: false,
        reviewRequired: ['Playlist requires YouTube Data API or manual review.'],
      }),
      decisions: {
        decisions: [
          {
            candidateId: 'ytcand_ready',
            subjectCode: 'R23CP1401',
            lessonId: 'lesson_1',
            decision: 'approve',
            sourceEvidence: 'Reviewer evidence.',
          },
        ],
      },
      actorUserId: 'reviewer_1',
      db,
    })).rejects.toThrow('Playlist candidates can only be drafted until individual videos are reviewed.')

    expect(db.resource.create).not.toHaveBeenCalled()
  })

  it('supports dry-run validation without writing rows', async () => {
    const db = promotionDbMock()

    const result = await promoteYouTubeCandidateMappings({
      reviewQueue: queueFixture(),
      decisions: {
        decisions: [
          {
            candidateId: 'ytcand_ready',
            subjectCode: 'R23CP1401',
            lessonId: 'lesson_1',
            decision: 'draft',
          },
        ],
      },
      actorUserId: 'reviewer_1',
      dryRun: true,
      db,
    })

    expect(result.promoted[0]).toMatchObject({
      status: 'validated',
      resourceId: null,
      lessonResourceId: null,
    })
    expect(db.resource.create).not.toHaveBeenCalled()
    expect(db.lessonResource.create).not.toHaveBeenCalled()
  })

  it('keeps the reviewed candidate language when an API caller does not override it', async () => {
    const db = promotionDbMock()
    const queue = JSON.parse(JSON.stringify(queueFixture())) as { items: Array<Record<string, unknown>> }
    queue.items[0]!.language = 'hi'

    await promoteYouTubeCandidateMappings({
      reviewQueue: queue,
      decisions: {
        decisions: [{ candidateId: 'ytcand_ready', subjectCode: 'R23CP1401', lessonId: 'lesson_1', decision: 'draft' }],
      },
      actorUserId: 'reviewer_1',
      db,
    })

    expect(db.resource.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ language: 'hi' }),
    }))
  })
})

function promotionDbMock(): YouTubeCandidatePromotionDb {
  const db = {
    subject: {
      findFirst: vi.fn().mockResolvedValue({ id: 'subject_1', code: 'R23CP1401', name: 'Programming in C' }),
    },
    lesson: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'lesson_1',
        title: 'Structure of a C Program',
        status: 'published',
        unit: { subjectId: 'subject_1' },
        topic: null,
      }),
    },
    resource: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(resourceFixture()),
      update: vi.fn().mockResolvedValue(resourceFixture()),
    },
    resourceReview: {
      create: vi.fn().mockResolvedValue({ id: 'review_1' }),
    },
    reviewDecision: {
      create: vi.fn().mockResolvedValue({ id: 'decision_1' }),
    },
    lessonResource: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({
        id: 'lesson_resource_1',
        status: 'approved',
        verificationStatus: 'verified',
      }),
      update: vi.fn().mockResolvedValue({
        id: 'lesson_resource_1',
        status: 'approved',
        verificationStatus: 'verified',
      }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    auditEvent: {
      create: vi.fn().mockResolvedValue({ id: 'audit_1' }),
    },
    $transaction: vi.fn(),
  }
  db.$transaction.mockImplementation((callback: (tx: typeof db) => Promise<unknown>) => callback(db))
  return db
}

function resourceFixture() {
  return {
    id: 'resource_1',
    title: 'Structure of a C Program',
    reviewStatus: 'approved',
    verified: true,
    visibility: 'published',
    moderationStatus: 'clear',
    subjectId: 'subject_1',
    archivedAt: null,
  }
}

function queueFixture(overrides: {
  mappingStatus?: 'blocked_missing_lesson_structure' | 'ready_for_lesson_mapping_review'
  resourceKind?: 'video' | 'playlist'
  metadataStatus?: string
  embeddable?: boolean
  reviewRequired?: string[]
} = {}) {
  return {
    items: [
      {
        candidateId: 'ytcand_ready',
        role: 'primary_video',
        resourceKind: overrides.resourceKind ?? 'video',
        originalUrl: 'https://youtu.be/abc123',
        canonicalUrl: 'https://www.youtube.com/watch?v=abc123',
        externalId: 'abc123',
        videoId: 'abc123',
        playlistId: null,
        title: 'Structure of a C Program',
        channel: 'CWIT Review',
        thumbnailUrl: 'https://i.ytimg.com/vi/abc123/hqdefault.jpg',
        embeddable: overrides.embeddable ?? true,
        metadataStatus: overrides.metadataStatus ?? 'found',
        availabilityStatus: 'available',
        sourceEvidence: {
          sourceId: 'cwit-youtube-sem-1-2',
          sourcePdf: 'content-import/CWIT_Semester_1_2_YouTube_Lecture_Links.pdf',
          sourcePage: 4,
        },
        officialSubjectCodes: ['R23CP1401'],
        programmeCodes: ['DCOMP'],
        subjectMappings: [
          {
            programmeCode: 'DCOMP',
            departmentCode: 'COMP',
            schemeCode: 'R23',
            semesterNumber: 2,
            subjectCode: 'R23CP1401',
            subjectName: 'Programming in C',
            subjectVerificationStatus: 'content_verified',
            curriculumManifest: 'content/curriculum/cwit-r23/comp/semester-2.json',
            lessonSlug: 'structure-of-a-c-program',
            unitNumber: 1,
            mappingStatus: overrides.mappingStatus ?? 'ready_for_lesson_mapping_review',
            blockers: [],
          },
        ],
        reviewRequired: overrides.reviewRequired ?? [],
        publicationStatus: 'draft',
      },
    ],
  }
}

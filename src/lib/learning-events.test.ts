import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const dbMock = vi.hoisted(() => ({
  learningEvent: { upsert: vi.fn(), createMany: vi.fn() },
  lesson: { findUnique: vi.fn() },
  subject: { findUnique: vi.fn() },
}))

vi.mock('@/lib/db', () => ({ db: dbMock }))

import {
  getLessonEventContext,
  learningSourceRoute,
  recordLearningEvent,
} from '@/lib/learning-events'

describe('canonical learning events', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dbMock.learningEvent.upsert.mockResolvedValue({ id: 'event-1' })
  })

  it('writes an idempotent, versioned event with academic context', async () => {
    await recordLearningEvent({
      userId: 'user-1',
      type: 'video_completed',
      idempotencyKey: 'video_completed:lesson-1:video-1',
      sourceRoute: '/learn/diploma/lesson-1',
      programmeCode: 'CO',
      semesterNumber: 3,
      subjectId: 'subject-1',
      unitNumber: 2,
      lessonId: 'lesson-1',
      payload: { watchPercent: 96 },
    })

    expect(dbMock.learningEvent.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        userId_idempotencyKey: {
          userId: 'user-1',
          idempotencyKey: 'video_completed:lesson-1:video-1',
        },
      },
      update: {},
      create: expect.objectContaining({
        type: 'video_completed',
        schemaVersion: 1,
        programmeCode: 'CO',
        semesterNumber: 3,
        subjectId: 'subject-1',
        unitNumber: 2,
        lessonId: 'lesson-1',
        payloadJson: JSON.stringify({ watchPercent: 96 }),
      }),
    }))
  })

  it('resolves lesson context through a direct unit', async () => {
    dbMock.lesson.findUnique.mockResolvedValue({
      unit: {
        number: 4,
        subject: {
          id: 'subject-4',
          semester: { number: 5, scheme: { programme: { code: 'CIOT' } } },
        },
      },
      topic: null,
    })

    await expect(getLessonEventContext('lesson-4')).resolves.toEqual({
      lessonId: 'lesson-4',
      unitNumber: 4,
      subjectId: 'subject-4',
      semesterNumber: 5,
      programmeCode: 'CIOT',
    })
  })

  it('uses only the path and query from a same-page referrer', () => {
    const request = new NextRequest('https://lernio.test/api/progress/video', {
      headers: { referer: 'https://lernio.test/learn/co/semester/3?mode=video#chapter' },
    })
    expect(learningSourceRoute(request, '/learn')).toBe('/learn/co/semester/3?mode=video')
  })

  it('rejects oversized payloads before they can reach the database', async () => {
    await expect(recordLearningEvent({
      userId: 'user-1',
      type: 'tutor_help_requested',
      idempotencyKey: 'tutor:1',
      sourceRoute: '/tutor',
      payload: { text: 'x'.repeat(33_000) },
    })).rejects.toThrow('exceeds 32 KB')
    expect(dbMock.learningEvent.upsert).not.toHaveBeenCalled()
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  evaluateLessonCompletionCriteria,
  getLessonCompletionPolicyState,
} from './lesson-completion-policy'

const dbMock = vi.hoisted(() => ({
  lessonCompletionCriteria: {
    findFirst: vi.fn(),
  },
  videoWatchProgress: {
    aggregate: vi.fn(),
  },
  questionAttempt: {
    count: vi.fn(),
  },
  quizAttempt: {
    count: vi.fn(),
  },
}))

vi.mock('@/lib/db', () => ({ db: dbMock }))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('evaluateLessonCompletionCriteria', () => {
  it('allows completion when no custom criteria exist', () => {
    expect(
      evaluateLessonCompletionCriteria(null, {
        explicitDone: false,
        maxVideoPercent: 0,
        hasPracticeAttempt: false,
        hasQuizPass: false,
      }),
    ).toEqual({ canComplete: true, blockers: [] })
  })

  it('requires configured video, practice, quiz and explicit evidence', () => {
    const result = evaluateLessonCompletionCriteria(
      {
        minimumVideoPercent: 80,
        requirePractice: true,
        requireQuizPass: true,
        requireExplicitDone: true,
      },
      {
        explicitDone: true,
        maxVideoPercent: 40,
        hasPracticeAttempt: false,
        hasQuizPass: false,
      },
    )

    expect(result.canComplete).toBe(false)
    expect(result.blockers).toEqual([
      'Watch at least 80% of the approved lesson video.',
      'Complete the required lesson practice evidence.',
      'Pass the required lesson quiz.',
    ])
  })

  it('allows completion when required evidence is satisfied', () => {
    expect(
      evaluateLessonCompletionCriteria(
        {
          minimumVideoPercent: 75,
          requirePractice: false,
          requireQuizPass: false,
          requireExplicitDone: true,
        },
        {
          explicitDone: true,
          maxVideoPercent: 90,
          hasPracticeAttempt: false,
          hasQuizPass: false,
        },
      ).canComplete,
    ).toBe(true)
  })

  it('uses lesson-scoped practice attempts as completion evidence', async () => {
    dbMock.lessonCompletionCriteria.findFirst.mockResolvedValue({
      minimumVideoPercent: 80,
      requirePractice: true,
      requireQuizPass: false,
      requireExplicitDone: true,
    })
    dbMock.videoWatchProgress.aggregate.mockResolvedValue({
      _max: { watchPercent: 95 },
    })
    dbMock.questionAttempt.count.mockResolvedValue(1)

    await expect(getLessonCompletionPolicyState('user_1', 'lesson_1', true)).resolves.toEqual({
      canComplete: true,
      blockers: [],
    })
    expect(dbMock.questionAttempt.count).toHaveBeenCalledWith({
      where: { userId: 'user_1', lessonId: 'lesson_1' },
    })
  })

  it('uses lesson-linked submitted quiz attempts as quiz-pass evidence', async () => {
    dbMock.lessonCompletionCriteria.findFirst.mockResolvedValue({
      minimumVideoPercent: 0,
      requirePractice: false,
      requireQuizPass: true,
      minimumQuizScore: 70,
      requireExplicitDone: true,
    })
    dbMock.videoWatchProgress.aggregate.mockResolvedValue({
      _max: { watchPercent: 0 },
    })
    dbMock.questionAttempt.count.mockResolvedValue(0)
    dbMock.quizAttempt.count.mockResolvedValue(1)

    await expect(getLessonCompletionPolicyState('user_1', 'lesson_1', true)).resolves.toEqual({
      canComplete: true,
      blockers: [],
    })
    expect(dbMock.quizAttempt.count).toHaveBeenCalledWith({
      where: {
        userId: 'user_1',
        lessonId: 'lesson_1',
        status: { in: ['submitted', 'locked'] },
        completedAt: { not: null },
        score: { gte: 70 },
      },
    })
  })
})

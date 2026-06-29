import { describe, expect, it } from 'vitest'
import {
  codingChallengeContextFromRecord,
  codingChallengeWhereForLearningScope,
} from './coding-scope'

describe('coding challenge learning scope', () => {
  it('keeps global published challenges visible for a resolved scope', () => {
    expect(codingChallengeWhereForLearningScope({
      subjectIds: ['subject_1'],
      unitIds: ['unit_1'],
      topicIds: ['topic_1'],
      lessonIds: ['lesson_1'],
    })).toMatchObject({
      status: { in: ['published', 'active'] },
      OR: expect.arrayContaining([
        { subjectId: null, unitId: null, topicId: null, lessonId: null },
      ]),
    })
  })

  it('matches direct and inherited curriculum links inside the scope', () => {
    const where = codingChallengeWhereForLearningScope({
      subjectIds: ['subject_1'],
      unitIds: ['unit_1'],
      topicIds: ['topic_1'],
      lessonIds: ['lesson_1'],
    })

    expect(where.OR).toEqual(expect.arrayContaining([
      { subjectId: { in: ['subject_1'] } },
      { unitId: { in: ['unit_1'] } },
      { topicId: { in: ['topic_1'] } },
      { lessonId: { in: ['lesson_1'] } },
      { unit: { subjectId: { in: ['subject_1'] } } },
      { topic: { unit: { subjectId: { in: ['subject_1'] } } } },
      { lesson: { unit: { subjectId: { in: ['subject_1'] } } } },
    ]))
  })

  it('allows draft challenge previews only for preview-capable scopes', () => {
    expect(codingChallengeWhereForLearningScope({
      subjectIds: [],
      unitIds: [],
      topicIds: [],
      lessonIds: [],
      canPreviewDrafts: true,
    })).toMatchObject({
      status: { not: 'archived' },
    })
  })

  it('derives submission context from lesson, topic, or unit ancestry', () => {
    expect(codingChallengeContextFromRecord({
      lessonId: 'lesson_1',
      lesson: {
        id: 'lesson_1',
        topicId: 'topic_1',
        topic: {
          id: 'topic_1',
          unitId: 'unit_1',
          unit: { id: 'unit_1', subjectId: 'subject_1' },
        },
      },
    })).toEqual({
      subjectId: 'subject_1',
      unitId: 'unit_1',
      topicId: 'topic_1',
      lessonId: 'lesson_1',
    })

    expect(codingChallengeContextFromRecord({
      unitId: 'unit_2',
      unit: { id: 'unit_2', subjectId: 'subject_2' },
    })).toEqual({
      subjectId: 'subject_2',
      unitId: 'unit_2',
      topicId: null,
      lessonId: null,
    })
  })
})

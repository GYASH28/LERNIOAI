import { describe, expect, it } from 'vitest'
import {
  hasResolvedLearningScope,
  findLessonReferenceInLearningScope,
  isLessonIdInLearningScope,
  isSubjectIdInLearningScope,
  isTopicIdInLearningScope,
  lessonIdsForLearningScope,
  subjectIdForScopedLesson,
  subjectIdForScopedTopic,
  topicIdForScopedLesson,
  subjectIdsForLearningScope,
  topicIdsForLearningScope,
  type StudentLearningScope,
} from './get-student-learning-scope'

function scope(subjectIds: string[]): StudentLearningScope {
  return {
    userId: 'user_1',
    role: 'student',
    institution: { id: 'inst_1', code: 'CWIT', name: 'CWIT' },
    department: { id: 'dept_1', code: 'COMP', name: 'Computer Engineering' },
    programme: { id: 'prog_1', code: 'DCOMP', name: 'Diploma in Computer Engineering' },
    scheme: { id: 'scheme_1', code: 'R23', name: 'MPECS 2023', status: 'published' },
    semester: { id: 'semester_1', number: 2, name: 'Semester 2' },
    semesterNumber: 2,
    classGroup: null,
    canPreviewDrafts: false,
    subjects: subjectIds.map((id, index) => ({
      id,
      units: [
        {
          id: `unit_${index}`,
          topics: [{ id: `topic_${id}` }],
        },
      ],
    }) as StudentLearningScope['subjects'][number]),
    unresolvedReason: null,
  }
}

describe('learning scope predicates', () => {
  it('recognizes resolved scopes and extracts scoped subject IDs', () => {
    const current = scope(['subject_a', 'subject_b'])

    expect(hasResolvedLearningScope(current)).toBe(true)
    expect(subjectIdsForLearningScope(current)).toEqual(['subject_a', 'subject_b'])
  })

  it('rejects subjects outside the resolved scope', () => {
    const current = scope(['subject_a'])

    expect(isSubjectIdInLearningScope(current, 'subject_a')).toBe(true)
    expect(isSubjectIdInLearningScope(current, 'subject_b')).toBe(false)
  })

  it('maps scoped topics back to their subject', () => {
    const current = scope(['subject_a', 'subject_b'])

    expect(topicIdsForLearningScope(current)).toEqual(['topic_subject_a', 'topic_subject_b'])
    expect(isTopicIdInLearningScope(current, 'topic_subject_a')).toBe(true)
    expect(isTopicIdInLearningScope(current, 'topic_missing')).toBe(false)
    expect(subjectIdForScopedTopic(current, 'topic_subject_b')).toBe('subject_b')
    expect(subjectIdForScopedTopic(current, 'topic_missing')).toBeNull()
  })

  it('maps scoped lessons to their canonical route and curriculum references', () => {
    const current = {
      ...scope(['subject_a']),
      subjects: [
        {
          id: 'subject_a',
          code: 'R23CP1201',
          units: [
            {
              id: 'unit_1',
              number: 2,
              lessons: [
                {
                  id: 'lesson_unit',
                  title: 'Introduction to C',
                  order: 1,
                  durationMin: 15,
                  topicId: null,
                  unitId: 'unit_1',
                },
              ],
              topics: [
                {
                  id: 'topic_a',
                  lessons: [
                    {
                      id: 'lesson_topic',
                      title: 'Structure of a C Program',
                      order: 2,
                      durationMin: 20,
                      topicId: 'topic_a',
                      unitId: 'unit_1',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ] as StudentLearningScope['subjects'],
    }

    expect(lessonIdsForLearningScope(current)).toEqual(['lesson_unit', 'lesson_topic'])
    expect(isLessonIdInLearningScope(current, 'lesson_topic')).toBe(true)
    expect(isLessonIdInLearningScope(current, 'missing')).toBe(false)
    expect(subjectIdForScopedLesson(current, 'lesson_topic')).toBe('subject_a')
    expect(topicIdForScopedLesson(current, 'lesson_topic')).toBe('topic_a')

    expect(findLessonReferenceInLearningScope(current, 'lesson_topic')).toMatchObject({
      id: 'lesson_topic',
      subjectCode: 'R23CP1201',
      unitNumber: 2,
      topicId: 'topic_a',
      durationMin: 20,
      canonicalUrl:
        '/learn/DCOMP/semester/2/subject/R23CP1201/lesson/2-structure-of-a-c-program--lesson_topic',
    })
  })

  it('treats unresolved scopes as closed', () => {
    const unresolved = { ...scope([]), semester: null, unresolvedReason: 'current_semester_not_found' }

    expect(hasResolvedLearningScope(unresolved)).toBe(false)
    expect(subjectIdsForLearningScope(unresolved)).toEqual([])
    expect(topicIdsForLearningScope(unresolved)).toEqual([])
    expect(lessonIdsForLearningScope(unresolved)).toEqual([])
    expect(isSubjectIdInLearningScope(unresolved, 'subject_a')).toBe(false)
    expect(isTopicIdInLearningScope(unresolved, 'topic_subject_a')).toBe(false)
    expect(isLessonIdInLearningScope(unresolved, 'lesson_topic')).toBe(false)
  })
})

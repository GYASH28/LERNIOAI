import { describe, expect, it } from 'vitest'
import type { Subject, User } from '@/lib/types'
import {
  canonicalContinueLearningRoute,
  canonicalSemesterRouteForUser,
  canonicalSubjectRouteForUser,
  findLessonInSubject,
  programmeCodeForDepartment,
} from './canonical-learning-routes'

const user = {
  departmentCode: 'COMP',
  semesterNumber: 2,
} as User

const subject = {
  id: 'subject_1',
  code: 'R23CP1201',
  name: 'Programming in C',
  credits: 4,
  accentColor: '#123456',
  units: [
    {
      id: 'unit_1',
      number: 1,
      title: 'Basics',
      weightage: 20,
      topics: [
        {
          id: 'topic_1',
          slug: 'program-structure',
          title: 'Program Structure',
          difficulty: 'easy',
          examWeightage: 10,
          lessons: [{ id: 'lesson_topic', title: 'Structure of a C Program', order: 1, durationMin: 12 }],
        },
      ],
      lessons: [{ id: 'lesson_unit', title: 'Introduction to C', order: 0, durationMin: 8 }],
    },
  ],
} satisfies Subject

describe('canonical learning routes', () => {
  it('maps target departments to diploma programme codes', () => {
    expect(programmeCodeForDepartment('COMP')).toBe('DCOMP')
    expect(programmeCodeForDepartment('ciot')).toBe('DCIOT')
    expect(programmeCodeForDepartment('CIVIL')).toBeNull()
  })

  it('builds semester and subject routes from the current user scope', () => {
    expect(canonicalSemesterRouteForUser(user)).toBe('/learn/DCOMP/semester/2')
    expect(canonicalSubjectRouteForUser(user, subject)).toBe('/learn/DCOMP/semester/2/subject/R23CP1201')
  })

  it('finds unit-level and topic-level lessons', () => {
    expect(findLessonInSubject(subject, 'lesson_unit')?.title).toBe('Introduction to C')
    expect(findLessonInSubject(subject, 'lesson_topic')?.title).toBe('Structure of a C Program')
  })

  it('builds canonical continue-learning routes with lesson fallback to unit', () => {
    expect(
      canonicalContinueLearningRoute(user, [subject], {
        subjectId: 'subject_1',
        subjectCode: 'R23CP1201',
        unitNumber: 1,
        lessonId: 'lesson_topic',
      }),
    ).toBe('/learn/DCOMP/semester/2/subject/R23CP1201/lesson/1-structure-of-a-c-program--lesson_topic')

    expect(
      canonicalContinueLearningRoute(user, [subject], {
        subjectId: 'subject_1',
        subjectCode: 'R23CP1201',
        unitNumber: 1,
        lessonId: 'missing',
      }),
    ).toBe('/learn/DCOMP/semester/2/subject/R23CP1201/unit/1')
  })
})

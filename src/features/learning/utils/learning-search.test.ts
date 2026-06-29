import { describe, expect, it } from 'vitest'
import {
  buildLearningResourceSearchResult,
  buildLearningSearchResults,
  type LearningSearchScope,
} from './learning-search'

const scope = {
  programme: { code: 'DCOMP', name: 'Diploma in Computer Engineering' },
  semester: { number: 2, name: 'Semester 2' },
  subjects: [
    {
      id: 'subject_c',
      code: 'R23CP1401',
      name: 'Programming in C',
      shortName: 'C',
      units: [
        {
          id: 'unit_intro',
          number: 1,
          title: 'Introduction to C',
          topics: [
            {
              id: 'topic_structure',
              slug: 'program-structure',
              title: 'Program Structure',
              lessons: [
                {
                  id: 'lesson_structure',
                  title: 'Structure of a C Program',
                  order: 1,
                  durationMin: 12,
                  topicId: 'topic_structure',
                },
              ],
            },
          ],
          lessons: [
            {
              id: 'lesson_intro',
              title: 'Introduction to Programming',
              order: 0,
              durationMin: 8,
            },
          ],
        },
      ],
    },
  ],
} satisfies LearningSearchScope

describe('learning search results', () => {
  it('builds canonical lesson and subject links from scoped curriculum only', () => {
    const results = buildLearningSearchResults(scope, 'c program')

    expect(results[0]).toMatchObject({
      kind: 'lesson',
      title: 'Structure of a C Program',
      href: '/learn/DCOMP/semester/2/subject/R23CP1401/lesson/1-structure-of-a-c-program--lesson_structure',
    })
    expect(results.some((result) => result.href.includes('DCIOT'))).toBe(false)
  })

  it('routes topic matches to the canonical parent unit anchor', () => {
    const results = buildLearningSearchResults(scope, 'program structure')

    expect(results.some((result) =>
      result.kind === 'topic' &&
      result.href === '/learn/DCOMP/semester/2/subject/R23CP1401/unit/1#topic-program-structure',
    )).toBe(true)
  })

  it('creates note/resource results without publishing draft data', () => {
    const result = buildLearningResourceSearchResult({
      query: 'notes c',
      programmeCode: 'DCOMP',
      semesterNumber: 2,
      resource: {
        id: 'resource_notes',
        title: 'C Program Structure Notes',
        type: 'pdf',
        subjectId: 'subject_c',
        subject: { code: 'R23CP1401', name: 'Programming in C' },
        lessonResource: {
          role: 'lesson_notes',
          lesson: {
            id: 'lesson_structure',
            title: 'Structure of a C Program',
            order: 1,
            unit: null,
            topic: {
              title: 'Program Structure',
              unit: { number: 1, subject: { code: 'R23CP1401' } },
            },
          },
        },
      },
    })

    expect(result).toMatchObject({
      kind: 'notes',
      href: '/learn/DCOMP/semester/2/subject/R23CP1401/lesson/1-structure-of-a-c-program--lesson_structure',
    })
  })
})

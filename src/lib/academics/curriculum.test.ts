import { describe, expect, it } from 'vitest'
import { getCurriculumChapter, getCurriculumSubject, getCurriculumSubjects } from './curriculum'
import { defaultSubjectsForStream, isJeeProfile } from './types'

describe('Lernio academic curriculum', () => {
  it('uses class and subject hierarchy instead of semester/programme scope', () => {
    const physics = getCurriculumSubject('11', 'physics')

    expect(physics).not.toBeNull()
    expect(physics?.board).toBe('CBSE')
    expect(physics?.classLevel).toBe('11')
    expect(physics?.chapters.some((chapter) => chapter.slug === 'laws-of-motion')).toBe(true)
    expect(physics).not.toHaveProperty('semesterNumber')
    expect(physics).not.toHaveProperty('programmeCode')
  })

  it('keeps Class 11 and Class 12 curriculum separate', () => {
    expect(getCurriculumChapter('11', 'physics', 'laws-of-motion')?.name).toBe('Laws of Motion')
    expect(getCurriculumChapter('12', 'physics', 'laws-of-motion')).toBeNull()
    expect(getCurriculumChapter('12', 'physics', 'current-electricity')?.name).toBe('Current Electricity')
  })

  it('returns only subjects selected for the student profile', () => {
    const subjects = getCurriculumSubjects('12', ['physics', 'chemistry'])
    expect(subjects.map((subject) => subject.slug)).toEqual(['physics', 'chemistry'])
  })

  it('covers every default science-stream subject in both classes', () => {
    for (const classLevel of ['11', '12'] as const) {
      for (const stream of ['PCM', 'PCB', 'PCMB'] as const) {
        const expected = defaultSubjectsForStream(stream)
        const available = getCurriculumSubjects(classLevel, expected).map((subject) => subject.slug)
        expect(new Set(available)).toEqual(new Set(expected))
      }
    }
  })

  it('keeps Biology and English board-only rather than inventing JEE coverage', () => {
    const biology = getCurriculumSubject('12', 'biology')
    const english = getCurriculumSubject('12', 'english')

    expect(biology?.chapters.length).toBeGreaterThan(0)
    expect(english?.chapters.length).toBeGreaterThan(0)
    expect(biology?.chapters.every((chapter) => chapter.examTags.length === 1 && chapter.examTags[0] === 'BOARDS')).toBe(true)
    expect(english?.chapters.every((chapter) => chapter.examTags.length === 1 && chapter.examTags[0] === 'BOARDS')).toBe(true)
  })
})

describe('academic profile rules', () => {
  it('gives PCM students the correct default core subjects', () => {
    expect(defaultSubjectsForStream('PCM')).toEqual([
      'physics',
      'chemistry',
      'mathematics',
      'english',
    ])
  })

  it('enables JEE only for relevant PCM/PCMB profiles', () => {
    expect(isJeeProfile({ stream: 'PCM', targetExams: ['JEE_MAIN'] })).toBe(true)
    expect(isJeeProfile({ stream: 'PCMB', targetExams: ['BOARDS', 'JEE_MAIN', 'JEE_ADVANCED'] })).toBe(true)
    expect(isJeeProfile({ stream: 'PCB', targetExams: ['BOARDS'] })).toBe(false)
    expect(isJeeProfile({ stream: 'COMMERCE', targetExams: ['BOARDS'] })).toBe(false)
  })
})

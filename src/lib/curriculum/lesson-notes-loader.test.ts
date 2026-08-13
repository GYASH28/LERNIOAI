import { describe, expect, it } from 'vitest'
import {
  findLessonBySlug,
  getAvailableNotesSubjects,
  getSubjectNotes,
} from './lesson-notes-loader'

describe('official CWIT curriculum note fallback', () => {
  it('provides source-backed notes for a CIOT subject without a reviewed note pack', () => {
    const notes = getSubjectNotes('R23CI2607')

    expect(notes?.subjectName).toMatch(/Database Management/i)
    expect(notes?.programmeCode).toBe('DCIOT')
    expect(notes?.units.length).toBeGreaterThanOrEqual(5)
    expect(notes?.units[0].lessons[0].theory).toMatch(/database|data/i)
    expect(notes?.units[0].lessons[0].objectives?.length).toBeGreaterThan(0)
    expect(notes?.units[0].lessons[0].tables[0]?.title).toMatch(/official CWIT/i)
    expect(notes?.units[0].lessons[0].practiceQuestions.length).toBeGreaterThan(0)
  })

  it('uses official CWIT unit structure ahead of older generic subject packs', () => {
    const notes = getSubjectNotes('R23CP2402')

    expect(notes?.units[0].lessons).toHaveLength(1)
    expect(notes?.units[0].lessons[0].slug).toMatch(/^unit-1-/)
    expect(notes?.programmeCode).toBe('DCOMP')
    expect(notes?.units[0].lessons[0].theory).toMatch(/Official CWIT R23 scope/i)
    expect(notes?.units[0].lessons[0].keyConcepts.length).toBeGreaterThan(0)
  })

  it('makes all official subjects discoverable in Materials', () => {
    const subjects = getAvailableNotesSubjects()
    const codes = new Set(subjects.map((subject) => subject.code.toUpperCase()))

    expect(codes.size).toBeGreaterThanOrEqual(86)
    expect(codes.has('R23CI2607')).toBe(true)
    expect(codes.has('R23CP2402')).toBe(true)
  })

  it('gives every official CWIT subject a source-grounded study layer and exposes missing source detail honestly', () => {
    const subjects = getAvailableNotesSubjects()
      .filter((subject) => /^R23C[IP]/i.test(subject.code))

    expect(subjects).toHaveLength(86)

    const unavailableDetailedScope: string[] = []
    let scopedLessonCount = 0

    for (const subject of subjects) {
      const notes = getSubjectNotes(subject.code)
      expect(notes, subject.code).not.toBeNull()
      expect(notes?.programmeCode, subject.code).toMatch(/DCOMP|DCIOT/)

      for (const unit of notes?.units ?? []) {
        expect(unit.lessons.length, `${subject.code} unit ${unit.number}`).toBeGreaterThan(0)
        for (const lesson of unit.lessons) {
          if (lesson.theory?.match(/Official CWIT R23 (scope|course-level outcomes)/i)) {
            scopedLessonCount += 1
            expect(lesson.objectives?.length, `${subject.code}/${lesson.slug}`).toBeGreaterThan(0)
            expect(lesson.tables.some((table) => /official CWIT/i.test(table.title)), `${subject.code}/${lesson.slug}`).toBe(true)
          } else {
            unavailableDetailedScope.push(subject.code)
            expect(lesson.callouts?.some((callout) => callout.type === 'warning'), `${subject.code}/${lesson.slug}`).toBe(true)
          }
        }
      }
    }

    expect(scopedLessonCount).toBeGreaterThanOrEqual(404)
    expect([...new Set(unavailableDetailedScope)].sort()).toEqual([
      'R23CI5602',
      'R23CP5401',
      'R23CP5402',
    ])
  })

  it('resolves a canonical fallback unit slug without fuzzy partial matching', () => {
    const match = findLessonBySlug('R23CI2607', 'unit-1-introduction-to-database-system')

    expect(match?.unit.number).toBe(1)
    expect(match?.lesson.slug).toBe('unit-1-introduction-to-database-system')
  })
})

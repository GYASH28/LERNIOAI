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
    expect(notes?.units.length).toBeGreaterThanOrEqual(5)
    expect(notes?.units[0].lessons[0].theory).toMatch(/database|data/i)
    expect(notes?.units[0].lessons[0].objectives?.length).toBeGreaterThan(0)
  })

  it('keeps richer reviewed subject notes ahead of the curriculum fallback', () => {
    const notes = getSubjectNotes('R23CP2402')

    expect(notes?.units[0].lessons.length).toBeGreaterThan(1)
    expect(notes?.units[0].lessons[0].slug).not.toMatch(/^unit-1-/)
  })

  it('makes all official subjects discoverable in Materials', () => {
    const subjects = getAvailableNotesSubjects()
    const codes = new Set(subjects.map((subject) => subject.code.toUpperCase()))

    expect(codes.size).toBeGreaterThanOrEqual(86)
    expect(codes.has('R23CI2607')).toBe(true)
    expect(codes.has('R23CP2402')).toBe(true)
  })

  it('resolves a canonical fallback unit slug without fuzzy partial matching', () => {
    const match = findLessonBySlug('R23CI2607', 'unit-1-introduction-to-database-system')

    expect(match?.unit.number).toBe(1)
    expect(match?.lesson.slug).toBe('unit-1-introduction-to-database-system')
  })
})

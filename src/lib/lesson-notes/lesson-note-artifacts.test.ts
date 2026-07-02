import { describe, expect, it } from 'vitest'
import { lessonNotePdfFileName } from './lesson-note-artifacts'
import type { LessonNoteDocument } from './lesson-note-document'

describe('lesson note artifact naming', () => {
  it('builds stable filesystem-safe PDF names', () => {
    const document = {
      documentType: 'lesson_notes',
      programmeCode: 'DCOMP',
      semesterNumber: 2,
      subjectCode: 'R23CP1401',
      unitNumber: 1,
      lessonSlug: 'Structure of C Program',
      version: 3,
    } as LessonNoteDocument

    expect(lessonNotePdfFileName(document)).toBe(
      'dcomp__sem-2__r23cp1401__unit-1__structure-of-c-program__v3__lesson_notes.pdf',
    )
  })
})

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import {
  lessonNotePreviewSlug,
  listLessonNotePreviews,
  loadLessonNotePreview,
  normalizePreviewSlug,
} from './lesson-note-files'
import type { LessonNoteDocument } from './lesson-note-document'

let tempRoot: string | null = null

afterEach(() => {
  if (tempRoot) rmSync(tempRoot, { recursive: true, force: true })
  tempRoot = null
})

const document: LessonNoteDocument = {
  documentType: 'lesson_notes',
  templateVersion: 'lesson-notes-v1',
  verificationStatus: 'ready_for_review',
  programmeCode: 'DCOMP',
  semesterNumber: 2,
  subjectCode: 'R23CP1401',
  unitNumber: 1,
  lessonSlug: '1-structure-of-a-c-program--lesson_1',
  lessonTitle: 'Structure of a C Program',
  version: 1,
  deepLink: 'https://lernio.example/learn/DCOMP/semester/2/subject/R23CP1401/lesson/1-structure-of-a-c-program--lesson_1',
  learningOutcomes: ['Explain the parts of a simple C program.'],
  prerequisites: [],
  sections: [
    {
      id: 'program-parts',
      title: 'Program Parts',
      body: 'A C program usually contains headers, main function, declarations, statements, and return value.',
      citationIds: ['official-1'],
    },
  ],
  workedExamples: [],
  commonMistakes: [],
  examTips: [],
  practiceSet: [],
  glossary: [],
  sources: [
    {
      id: 'official-1',
      label: 'CWIT R23 Computer Engineering curriculum',
      sourceType: 'official_curriculum',
      url: 'https://cwit.mespune.org/wp-content/uploads/2021/07/COMPUTER-MPECS-23-CURRICULUM.pdf',
    },
  ],
}

describe('lesson note preview files', () => {
  it('loads only valid note documents by deterministic preview slug', () => {
    tempRoot = mkdtempSync(join(tmpdir(), 'lernio-notes-'))
    writeFileSync(join(tempRoot, 'valid.json'), JSON.stringify(document), 'utf8')
    writeFileSync(join(tempRoot, 'invalid.json'), JSON.stringify({ documentType: 'lesson_notes' }), 'utf8')

    const previews = listLessonNotePreviews(tempRoot)
    const slug = lessonNotePreviewSlug(document)

    expect(previews).toHaveLength(1)
    expect(previews[0]?.slug).toBe(slug)
    expect(loadLessonNotePreview(slug, tempRoot)?.document.lessonTitle).toBe('Structure of a C Program')
  })

  it('rejects unsafe preview slugs', () => {
    expect(normalizePreviewSlug('../secret')).toBeNull()
    expect(normalizePreviewSlug('DCOMP__R23CP1401')).toBe('dcomp__r23cp1401')
  })
})

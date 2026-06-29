import type { LessonNoteDocument } from './lesson-note-document'

export function lessonNoteArtifactBaseName(document: LessonNoteDocument): string {
  return [
    document.programmeCode,
    `sem-${document.semesterNumber}`,
    document.subjectCode,
    `unit-${document.unitNumber}`,
    document.lessonSlug,
    `v${document.version}`,
    document.documentType,
  ].map(safeArtifactSegment).join('__')
}

export function lessonNotePdfFileName(document: LessonNoteDocument): string {
  return `${lessonNoteArtifactBaseName(document)}.pdf`
}

function safeArtifactSegment(value: string | number): string {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

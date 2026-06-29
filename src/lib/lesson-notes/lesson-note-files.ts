import 'server-only'

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  LessonNoteDocumentSchema,
  type LessonNoteDocument,
} from './lesson-note-document'

const DEFAULT_NOTES_ROOT = join(process.cwd(), 'content', 'lesson-notes')

export interface LessonNotePreview {
  slug: string
  filePath: string
  document: LessonNoteDocument
}

export function lessonNotePreviewSlug(document: Pick<
  LessonNoteDocument,
  'programmeCode' | 'subjectCode' | 'lessonSlug' | 'documentType' | 'version'
>): string {
  return [
    document.programmeCode,
    document.subjectCode,
    document.lessonSlug,
    document.documentType,
    `v${document.version}`,
  ].join('__').toLowerCase()
}

export function listLessonNotePreviews(root = DEFAULT_NOTES_ROOT): LessonNotePreview[] {
  if (!existsSync(root)) return []

  return findJsonFiles(root).flatMap((filePath) => {
    const raw = JSON.parse(readFileSync(filePath, 'utf8')) as unknown
    const parsed = LessonNoteDocumentSchema.safeParse(raw)
    if (!parsed.success) return []
    return [{
      slug: lessonNotePreviewSlug(parsed.data),
      filePath,
      document: parsed.data,
    }]
  }).sort((a, b) =>
    a.document.programmeCode.localeCompare(b.document.programmeCode) ||
    a.document.subjectCode.localeCompare(b.document.subjectCode) ||
    a.document.lessonTitle.localeCompare(b.document.lessonTitle) ||
    b.document.version - a.document.version,
  )
}

export function loadLessonNotePreview(noteSlug: string, root = DEFAULT_NOTES_ROOT): LessonNotePreview | null {
  const normalized = normalizePreviewSlug(noteSlug)
  if (!normalized) return null
  return listLessonNotePreviews(root).find((preview) => preview.slug === normalized) ?? null
}

export function normalizePreviewSlug(value: string): string | null {
  const normalized = decodeURIComponent(value).trim().toLowerCase()
  if (!normalized || !/^[a-z0-9_-]+(?:__[a-z0-9_-]+)*$/.test(normalized)) return null
  return normalized
}

function findJsonFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name)
    if (entry.isDirectory()) return findJsonFiles(path)
    return entry.isFile() && entry.name.endsWith('.json') ? [path] : []
  })
}

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { LessonNoteDocumentSchema } from '../src/lib/lesson-notes/lesson-note-document'

const defaultRoot = join('content', 'lesson-notes')

const LegacyLessonSchema = z.object({
  slug: z.string().trim().min(1),
  title: z.string().trim().min(1),
  durationMin: z.number().int().positive().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  overview: z.string().trim().min(1).optional(),
  theory: z.string().trim().min(1).optional(),
}).passthrough()

const LegacyUnitSchema = z.object({
  number: z.number().int().min(1).max(20),
  title: z.string().trim().min(1),
  lessons: z.array(LegacyLessonSchema).min(1),
}).passthrough()

const LegacySubjectLessonPackSchema = z.object({
  subjectCode: z.string().trim().min(1),
  subjectName: z.string().trim().min(1),
  semester: z.number().int().min(1).max(8),
  credits: z.number().nonnegative().optional(),
  units: z.array(LegacyUnitSchema).min(1),
}).superRefine((pack, ctx) => {
  const unitNumbers = new Set<number>()
  const lessonSlugs = new Set<string>()

  for (const unit of pack.units) {
    if (unitNumbers.has(unit.number)) {
      ctx.addIssue({
        code: 'custom',
        message: `Duplicate unit number ${unit.number}.`,
        path: ['units'],
      })
    }
    unitNumbers.add(unit.number)

    for (const lesson of unit.lessons) {
      if (lessonSlugs.has(lesson.slug)) {
        ctx.addIssue({
          code: 'custom',
          message: `Duplicate lesson slug "${lesson.slug}".`,
          path: ['units', unit.number, 'lessons'],
        })
      }
      lessonSlugs.add(lesson.slug)
    }
  }
})

function main() {
  const targets = process.argv.slice(2)
  const files = targets.length > 0
    ? targets
    : existsSync(defaultRoot)
      ? findJsonFiles(defaultRoot)
      : []

  let failed = 0
  let lessonDocuments = 0
  let subjectPacks = 0

  for (const file of files) {
    let raw: unknown
    try {
      raw = JSON.parse(readFileSync(file, 'utf8'))
    } catch (error) {
      failed += 1
      console.error(`[lesson-notes] invalid JSON ${file}`)
      console.error(error instanceof Error ? `  - ${error.message}` : '  - Unknown JSON parse error')
      continue
    }

    const isSingleLessonDocument =
      typeof raw === 'object' && raw !== null && 'documentType' in raw

    const schema = isSingleLessonDocument
      ? LessonNoteDocumentSchema
      : LegacySubjectLessonPackSchema
    const parsed = schema.safeParse(raw)

    if (!parsed.success) {
      failed += 1
      console.error(`[lesson-notes] invalid ${file}`)
      console.error(parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n'))
      continue
    }

    if (isSingleLessonDocument) lessonDocuments += 1
    else subjectPacks += 1
  }

  if (failed > 0) {
    process.exitCode = 1
    return
  }

  console.warn(
    `[lesson-notes] ${files.length} document(s) valid (${lessonDocuments} lesson document(s), ${subjectPacks} subject pack(s)).`,
  )
}

function findJsonFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name)
    if (entry.isDirectory()) return findJsonFiles(path)
    return entry.isFile() && entry.name.endsWith('.json') ? [path] : []
  })
}

main()

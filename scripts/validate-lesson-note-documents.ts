import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { LessonNoteDocumentSchema } from '../src/lib/lesson-notes/lesson-note-document'

const defaultRoot = join('content', 'lesson-notes')

function main() {
  const targets = process.argv.slice(2)
  const files = targets.length > 0
    ? targets
    : existsSync(defaultRoot)
      ? findJsonFiles(defaultRoot)
      : []

  let failed = 0
  for (const file of files) {
    const parsed = LessonNoteDocumentSchema.safeParse(JSON.parse(readFileSync(file, 'utf8')))
    if (!parsed.success) {
      failed += 1
      console.error(`[lesson-notes] invalid ${file}`)
      console.error(parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n'))
    }
  }

  if (failed > 0) {
    process.exitCode = 1
    return
  }

  console.warn(`[lesson-notes] ${files.length} document(s) valid.`)
}

function findJsonFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name)
    if (entry.isDirectory()) return findJsonFiles(path)
    return entry.isFile() && entry.name.endsWith('.json') ? [path] : []
  })
}

main()

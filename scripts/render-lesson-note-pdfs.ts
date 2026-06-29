import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { chromium } from 'playwright'
import {
  LessonNoteDocumentSchema,
  renderLessonNoteHtml,
  type LessonNoteDocument,
} from '../src/lib/lesson-notes/lesson-note-document'
import { lessonNotePdfFileName } from '../src/lib/lesson-notes/lesson-note-artifacts'

const root = process.cwd()
const inputRoot = join(root, 'content', 'lesson-notes')
const outputRoot = join(root, 'output', 'pdf', 'lesson-notes')
const targets = process.argv.slice(2).filter((arg) => !arg.startsWith('--'))
const shouldWriteHtml = process.argv.includes('--html')

async function main() {
  const files = targets.length > 0
    ? targets.map((target) => join(root, target))
    : findJsonFiles(inputRoot)

  const documents = files.map(loadValidatedDocument)
  if (documents.length === 0) {
    console.warn('[lesson-notes:pdf] 0 document(s) rendered.')
    return
  }

  mkdirSync(outputRoot, { recursive: true })
  const browser = await chromium.launch()
  try {
    for (const item of documents) {
      const html = renderLessonNoteHtml(item.document)
      const baseName = lessonNotePdfFileName(item.document).replace(/\.pdf$/, '')
      const pdfPath = join(outputRoot, `${baseName}.pdf`)
      const page = await browser.newPage()
      await page.setContent(html, { waitUntil: 'load' })
      await page.emulateMedia({ media: 'print' })
      await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: '<span></span>',
        footerTemplate: '<div style="width:100%;font-size:9px;color:#6b7280;padding:0 24px;text-align:right;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
        margin: { top: '18mm', right: '14mm', bottom: '18mm', left: '14mm' },
      })
      await page.close()

      if (shouldWriteHtml) {
        writeFileSync(join(outputRoot, `${baseName}.html`), html, 'utf8')
      }

      console.warn(
        `[lesson-notes:pdf] rendered ${relative(root, item.file).replaceAll('\\', '/')} -> ` +
        `${relative(root, pdfPath).replaceAll('\\', '/')}`,
      )
    }
  } finally {
    await browser.close()
  }

  console.warn(`[lesson-notes:pdf] ${documents.length} document(s) rendered.`)
}

function loadValidatedDocument(file: string): { file: string; document: LessonNoteDocument } {
  const parsed = LessonNoteDocumentSchema.safeParse(JSON.parse(readFileSync(file, 'utf8')))
  if (!parsed.success) {
    throw new Error(
      `[lesson-notes:pdf] invalid ${relative(root, file)}\n` +
      parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n'),
    )
  }
  return { file, document: parsed.data }
}

function findJsonFiles(dir: string): string[] {
  try {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) return findJsonFiles(fullPath)
      return entry.isFile() && entry.name.endsWith('.json') ? [fullPath] : []
    })
  } catch {
    return []
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { buildTimetableEvidenceReport, type TimetableColumnText } from '../src/lib/curriculum/timetable-evidence'

const root = process.cwd()
const textPath = join(root, 'tmp', 'pdfs', 'official', 'Winter-Examination-2025.txt')
const columnTextPath = join(root, 'tmp', 'pdfs', 'official', 'Winter-Examination-2025.columns.json')
const outputPath = join(
  root,
  'content',
  'curriculum',
  'cwit-r23',
  'extraction-reports',
  'official-timetable-evidence.json',
)

const report = buildTimetableEvidenceReport({
  generatedAt: new Date().toISOString(),
  text: readFileSync(textPath, 'utf8'),
  columnTexts: readColumnTexts(columnTextPath),
  source: {
    sourceId: 'cwit-r23-winter-2025-timetable',
    title: 'CWIT Winter Examination 2025 Time Table',
    sourceUrl: 'https://cwit.mespune.org/wp-content/uploads/2025/10/Winter-Examination-2025.pdf',
    localPdfPath: 'content-import/official/Winter-Examination-2025.pdf',
    extractedTextPath: 'tmp/pdfs/official/Winter-Examination-2025.txt',
    columnTextPath: existsSync(columnTextPath)
      ? 'tmp/pdfs/official/Winter-Examination-2025.columns.json'
      : undefined,
  },
})

mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

console.warn(
  `[curriculum-timetable] wrote ${report.totals.uniqueCodes} code(s), ` +
  `${report.totals.appearances} appearance(s), ` +
  `${report.totals.publicationReadySemesterManifests} publication-ready manifest(s) to ` +
  relative(root, outputPath).replaceAll('\\', '/'),
)

function readColumnTexts(path: string): TimetableColumnText[] {
  if (!existsSync(path)) return []
  const payload = JSON.parse(readFileSync(path, 'utf8')) as { columns?: unknown }
  return Array.isArray(payload.columns) ? payload.columns as TimetableColumnText[] : []
}

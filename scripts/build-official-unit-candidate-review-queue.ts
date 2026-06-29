import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { buildOfficialUnitCandidateReviewQueue } from '../src/lib/curriculum/unit-candidate-review'

const root = process.cwd()
const defaultInput = join(
  root,
  'content',
  'curriculum',
  'cwit-r23',
  'extraction-reports',
  'official-structure-candidates.json',
)
const defaultOutput = join(
  root,
  'content',
  'curriculum',
  'cwit-r23',
  'extraction-reports',
  'official-unit-candidate-review-queue.json',
)

try {
  main()
} catch (error) {
  console.error(error)
  process.exit(1)
}

function main() {
  const inputPath = argValue('--input') ?? defaultInput
  const outputPath = argValue('--output') ?? defaultOutput
  const extractionReport = JSON.parse(readFileSync(inputPath, 'utf8')) as unknown

  const queue = buildOfficialUnitCandidateReviewQueue({
    extractionReport,
    sourceExtractionReport: relative(root, inputPath).replaceAll('\\', '/'),
  })

  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, `${JSON.stringify(queue, null, 2)}\n`, 'utf8')
  console.warn(
    `[unit-review-queue] wrote ${queue.items.length} subject(s), ` +
    `${queue.totals.readyForUnitPromotionReview} ready for reviewer promotion, ` +
    `${queue.totals.needsManualUnitReview} needing manual review to ` +
    relative(root, outputPath).replaceAll('\\', '/'),
  )
}

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name)
  if (index === -1) return null
  return process.argv[index + 1] ?? null
}

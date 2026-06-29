import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { buildCwitR23CoverageReport } from '../src/lib/curriculum/coverage-report'

const root = process.cwd()
const manifestRoot = join(root, 'content', 'curriculum', 'cwit-r23')
const youtubeMetadataPath = join(
  root,
  'content',
  'resources',
  'youtube-candidates',
  'cwit-r23-youtube-candidates.metadata.json',
)
const outputPath = join(root, 'content', 'reports', 'cwit-r23-learning-coverage.json')
const linkHealthPath = join(root, 'content', 'reports', 'cwit-r23-link-health.json')
const youtubeReviewQueuePath = join(
  root,
  'content',
  'resources',
  'youtube-candidates',
  'cwit-r23-youtube-candidate-review-queue.json',
)
const officialTimetableEvidencePath = join(
  root,
  'content',
  'curriculum',
  'cwit-r23',
  'extraction-reports',
  'official-timetable-evidence.json',
)
const officialCourseCatalogPath = join(
  root,
  'content',
  'curriculum',
  'cwit-r23',
  'extraction-reports',
  'official-course-catalog.json',
)
const officialUnitReviewQueuePath = join(
  root,
  'content',
  'curriculum',
  'cwit-r23',
  'extraction-reports',
  'official-unit-candidate-review-queue.json',
)

const manifestFiles = findManifestFiles(manifestRoot)
const manifests = manifestFiles.map((file) => JSON.parse(readFileSync(file, 'utf8')) as unknown)
const youtubeMetadata = existsSync(youtubeMetadataPath)
  ? JSON.parse(readFileSync(youtubeMetadataPath, 'utf8')) as unknown
  : undefined
const linkHealthReport = existsSync(linkHealthPath)
  ? JSON.parse(readFileSync(linkHealthPath, 'utf8')) as unknown
  : undefined
const youtubeReviewQueue = existsSync(youtubeReviewQueuePath)
  ? JSON.parse(readFileSync(youtubeReviewQueuePath, 'utf8')) as unknown
  : undefined
const officialTimetableEvidence = existsSync(officialTimetableEvidencePath)
  ? JSON.parse(readFileSync(officialTimetableEvidencePath, 'utf8')) as unknown
  : undefined
const officialCourseCatalog = existsSync(officialCourseCatalogPath)
  ? JSON.parse(readFileSync(officialCourseCatalogPath, 'utf8')) as unknown
  : undefined
const officialUnitReviewQueue = existsSync(officialUnitReviewQueuePath)
  ? JSON.parse(readFileSync(officialUnitReviewQueuePath, 'utf8')) as unknown
  : undefined

const report = buildCwitR23CoverageReport({
  manifests,
  youtubeMetadata,
  youtubeReviewQueue,
  linkHealthReport,
  officialTimetableEvidence,
  officialCourseCatalog,
  officialUnitReviewQueue,
  generatedAt: new Date().toISOString(),
})

mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

console.warn(
  `[coverage] wrote ${relative(root, outputPath).replaceAll('\\', '/')} ` +
  `(${report.totals.manifestsPresent}/${report.totals.semesters} manifests present, ` +
  `${report.totals.pendingVerification} pending verification item(s))`,
)

function findManifestFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    if (statSync(fullPath).isDirectory()) {
      out.push(...findManifestFiles(fullPath))
    } else if (/semester-\d+\.json$/.test(entry)) {
      out.push(fullPath)
    }
  }
  return out.sort()
}

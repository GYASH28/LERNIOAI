import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import {
  buildCwitR23CoverageReport,
  type DatabaseCoverageUnavailable,
} from '../src/lib/curriculum/coverage-report'
import type { DatabaseLearningCoverageSnapshot } from '../src/lib/curriculum/database-coverage-report'

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

interface CliOptions {
  withDb: boolean
  requireDb: boolean
}

async function main() {
  const options = parseCliOptions(process.argv.slice(2))
  const generatedAt = new Date().toISOString()
  const manifestFiles = findManifestFiles(manifestRoot)
  const manifests = manifestFiles.map((file) => JSON.parse(readFileSync(file, 'utf8')) as unknown)
  const youtubeMetadata = readJsonIfExists(youtubeMetadataPath)
  const linkHealthReport = readJsonIfExists(linkHealthPath)
  const youtubeReviewQueue = readJsonIfExists(youtubeReviewQueuePath)
  const officialTimetableEvidence = readJsonIfExists(officialTimetableEvidencePath)
  const officialCourseCatalog = readJsonIfExists(officialCourseCatalogPath)
  const officialUnitReviewQueue = readJsonIfExists(officialUnitReviewQueuePath)
  const databaseCoverage = options.withDb || options.requireDb
    ? await loadDatabaseCoverage(generatedAt, options)
    : {}

  const report = buildCwitR23CoverageReport({
    manifests,
    youtubeMetadata,
    youtubeReviewQueue,
    linkHealthReport,
    officialTimetableEvidence,
    officialCourseCatalog,
    officialUnitReviewQueue,
    ...databaseCoverage,
    generatedAt,
  })

  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

  const databaseSummary = report.databaseCoverage
    ? `, ${report.databaseCoverage.totals.lessons} live published lesson(s)`
    : report.databaseCoverageUnavailable
      ? ', database coverage unavailable'
      : ''

  console.warn(
    `[coverage] wrote ${relative(root, outputPath).replaceAll('\\', '/')} ` +
    `(${report.totals.manifestsPresent}/${report.totals.semesters} manifests present, ` +
    `${report.totals.pendingVerification} pending verification item(s)${databaseSummary})`,
  )
}

void main().catch((error) => {
  console.error(`[coverage] ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})

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

function readJsonIfExists(path: string): unknown {
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) as unknown : undefined
}

function parseCliOptions(args: readonly string[]): CliOptions {
  return {
    withDb: args.includes('--with-db'),
    requireDb: args.includes('--require-db'),
  }
}

async function loadDatabaseCoverage(
  generatedAt: string,
  options: CliOptions,
): Promise<{
  databaseCoverage?: DatabaseLearningCoverageSnapshot
  databaseCoverageUnavailable?: DatabaseCoverageUnavailable
}> {
  try {
    const { buildDatabaseLearningCoverageSnapshot } = await import(
      '../src/lib/curriculum/database-coverage-report'
    )
    return {
      databaseCoverage: await buildDatabaseLearningCoverageSnapshot({ generatedAt }),
    }
  } catch (error) {
    if (options.requireDb) throw error
    return {
      databaseCoverageUnavailable: {
        status: 'unavailable',
        checkedAt: generatedAt,
        errorName: error instanceof Error ? error.name : 'UnknownError',
        message: error instanceof Error ? error.message : String(error),
      },
    }
  }
}

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { buildYouTubeCandidateReviewQueue } from '../src/lib/resources/youtube-candidate-review'

const root = process.cwd()
const defaultInput = join(root, 'content', 'resources', 'youtube-candidates', 'cwit-r23-youtube-candidates.metadata.json')
const defaultOutput = join(root, 'content', 'resources', 'youtube-candidates', 'cwit-r23-youtube-candidate-review-queue.json')
const defaultCurriculumRoot = join(root, 'content', 'curriculum', 'cwit-r23')
const defaultOfficialCourseCatalog = join(
  root,
  'content',
  'curriculum',
  'cwit-r23',
  'extraction-reports',
  'official-course-catalog.json',
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
  const curriculumRoot = argValue('--curriculum-root') ?? defaultCurriculumRoot
  const officialCourseCatalogPath = argValue('--official-course-catalog') ?? defaultOfficialCourseCatalog

  const manifestFiles = findManifestFiles(curriculumRoot)
  const candidateManifest = JSON.parse(readFileSync(inputPath, 'utf8')) as unknown
  const curriculumManifests = manifestFiles.map((file) => JSON.parse(readFileSync(file, 'utf8')) as unknown)
  const curriculumManifestPaths = manifestFiles.map((file) => relative(root, file).replaceAll('\\', '/'))
  const officialCourseCatalog = existsSync(officialCourseCatalogPath)
    ? JSON.parse(readFileSync(officialCourseCatalogPath, 'utf8')) as unknown
    : undefined

  const queue = buildYouTubeCandidateReviewQueue({
    candidateManifest,
    curriculumManifests,
    officialCourseCatalog,
    candidateManifestPath: relative(root, inputPath).replaceAll('\\', '/'),
    curriculumManifestPaths,
  })

  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, `${JSON.stringify(queue, null, 2)}\n`)
  console.warn(
    `[youtube-review-queue] wrote ${queue.items.length} candidate(s), ` +
      `${queue.totals.subjectMappings} subject mapping(s), ` +
      `${queue.totals.blockedUnplacedOfficialSubject} unplaced official subject mapping(s), ` +
      `${queue.totals.blockedMissingLessonStructure} blocked for lesson structure to ${relative(root, outputPath)}`,
  )
}

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

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name)
  if (index === -1) return null
  return process.argv[index + 1] ?? null
}

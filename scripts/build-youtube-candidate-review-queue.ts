import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import {
  buildOfficialLessonVideoReviewQueue,
  type OfficialLessonVideoReconciliation,
} from '../src/lib/resources/official-lesson-video-review'

const root = process.cwd()
const defaultInput = join(root, 'content', 'resources', 'lesson-video-mappings', 'cwit-r23-pending-video-reconciliation.json')
const defaultOutput = join(root, 'content', 'resources', 'youtube-candidates', 'cwit-r23-youtube-candidate-review-queue.json')
const defaultOfficialCourseContent = join(root, 'content', 'curriculum', 'cwit-r23', 'official-course-content.json')

try {
  main()
} catch (error) {
  console.error(error)
  process.exit(1)
}

function main() {
  const inputPath = argValue('--input') ?? defaultInput
  const outputPath = argValue('--output') ?? defaultOutput
  const officialCourseContentPath = argValue('--official-course-content') ?? defaultOfficialCourseContent
  const reconciliation = JSON.parse(readFileSync(inputPath, 'utf8')) as OfficialLessonVideoReconciliation
  const officialCourseContent = JSON.parse(readFileSync(officialCourseContentPath, 'utf8')) as { subjects?: unknown[] }
  const queue = buildOfficialLessonVideoReviewQueue({
    reconciliation,
    officialSubjects: (officialCourseContent.subjects ?? []) as never[],
  })

  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, `${JSON.stringify(queue, null, 2)}\n`)
  console.warn(
    `[youtube-review-queue] wrote ${queue.items.length} candidate(s), ` +
      `${queue.learningCoverage?.lessonCandidatesReadyForReview ?? queue.totals.subjectMappings} lesson-specific review candidate(s), ` +
      `${queue.learningCoverage?.lessonsWithoutCandidate ?? 0} official lesson(s) without a candidate to ${relative(root, outputPath)}`,
  )
}

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name)
  if (index === -1) return null
  return process.argv[index + 1] ?? null
}

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import {
  buildMissingLessonVideoResearchQueue,
  type OfficialSubjectForResearch,
  type ReconciledLessonVideo,
} from '../src/lib/resources/missing-lesson-video-research'

const root = process.cwd()
const officialPath = join(root, 'content', 'curriculum', 'cwit-r23', 'official-course-content.json')
const reconciliationPath = join(root, 'content', 'resources', 'lesson-video-mappings', 'cwit-r23-pending-video-reconciliation.json')
const outputPath = join(root, 'content', 'resources', 'youtube-candidates', 'cwit-r23-missing-lesson-video-research-queue.json')

const official = JSON.parse(readFileSync(officialPath, 'utf8')) as { subjects?: OfficialSubjectForResearch[] }
const reconciliation = JSON.parse(readFileSync(reconciliationPath, 'utf8')) as { reconciled?: ReconciledLessonVideo[] }
const queue = buildMissingLessonVideoResearchQueue({
  officialSubjects: official.subjects ?? [],
  reconciled: reconciliation.reconciled ?? [],
})

mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, `${JSON.stringify(queue, null, 2)}\n`, 'utf8')
console.warn(
  `[youtube-gap-queue] wrote ${queue.totals.lessonsNeedingResearch} exact official lesson research row(s) to ${relative(root, outputPath)}`,
)

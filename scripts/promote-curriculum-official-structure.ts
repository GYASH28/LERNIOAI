import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import {
  extractOfficialCourseStructure,
  hasPromotableUnits,
  type OfficialCourseOutcomeCandidate,
  type OfficialUnitCandidate,
} from '../src/lib/curriculum/official-course-extraction'

interface SourceReference {
  sourceId: string
  pages?: number[]
}

interface CurriculumManifest {
  departmentCode: string
  programmeCode: string
  semesterNumber: number
  sourceReferences: Array<{ sourceId?: string; localPath?: string }>
  subjects: Array<{
    officialSubjectCode: string
    name: string
    outcomes: unknown[]
    units: unknown[]
  }>
}

const root = process.cwd()
const args = new Set(process.argv.slice(2))
const shouldWrite = args.has('--write')
const promoteUnits = args.has('--units')
const overwrite = args.has('--overwrite')

const manifestRoot = join(root, 'content', 'curriculum', 'cwit-r23')
const curriculumTextByDepartment = new Map([
  ['COMP', readFileSync(join(root, 'tmp', 'pdfs', 'official', 'COMP_R23_curriculum.txt'), 'utf8')],
  ['CIOT', readFileSync(join(root, 'tmp', 'pdfs', 'official', 'CIOT_R23_curriculum.txt'), 'utf8')],
])

let changedFiles = 0
let promotedOutcomes = 0
let promotedUnitSets = 0
const touched: string[] = []

for (const file of findManifestFiles(manifestRoot)) {
  const manifest = JSON.parse(readFileSync(file, 'utf8')) as CurriculumManifest
  const curriculumText = curriculumTextByDepartment.get(manifest.departmentCode)
  if (!curriculumText) continue

  const sourceId = curriculumSourceId(manifest)
  let changed = false

  for (const subject of manifest.subjects) {
    const structure = extractOfficialCourseStructure(curriculumText, subject.officialSubjectCode)
    if (structure.extractionStatus === 'course_block_not_found') continue

    if ((overwrite || subject.outcomes.length === 0) && structure.candidateOutcomes.length > 0) {
      subject.outcomes = toOutcomeRows(structure.candidateOutcomes, {
        sourceId,
        pages: structure.sourcePages,
      })
      promotedOutcomes += 1
      changed = true
    }

    if (
      promoteUnits &&
      (overwrite || subject.units.length === 0) &&
      structure.candidateUnits.length > 0
    ) {
      subject.units = toUnitRows(structure.candidateUnits, {
        sourceId,
        pages: structure.sourcePages,
      })
      promotedUnitSets += 1
      changed = true
    }
  }

  if (changed) {
    changedFiles += 1
    touched.push(relative(root, file).replaceAll('\\', '/'))
    if (shouldWrite) {
      writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
    }
  }
}

const mode = shouldWrite ? 'write' : 'dry-run'
console.warn(`[curriculum-promote] ${mode}: ${changedFiles} file(s), ${promotedOutcomes} subject outcome set(s), ${promotedUnitSets} subject unit set(s)`)
for (const file of touched) console.warn(`[curriculum-promote] ${shouldWrite ? 'updated' : 'would update'} ${file}`)

function toOutcomeRows(outcomes: OfficialCourseOutcomeCandidate[], source: SourceReference) {
  return outcomes.map((outcome, index) => ({
    order: index + 1,
    code: outcome.code,
    text: outcome.text,
    sourceReferences: [source],
    verificationStatus: 'content_verified',
  }))
}

function toUnitRows(units: OfficialUnitCandidate[], source: SourceReference) {
  return units.map((unit) => ({
    order: unit.order,
    title: unit.title,
    topics: [],
    sourceReferences: [source],
    verificationStatus: 'structure_verified',
    notes: `Promoted from official ${unit.source.replace('_', ' ')} extraction; topics remain pending review.`,
  }))
}

function curriculumSourceId(manifest: CurriculumManifest) {
  return manifest.sourceReferences.find((source) =>
    typeof source.sourceId === 'string' && /curriculum/i.test(source.sourceId),
  )?.sourceId ?? `${manifest.departmentCode.toLowerCase()}-r23-curriculum`
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

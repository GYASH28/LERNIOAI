import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { extractOfficialCourseStructure } from '../src/lib/curriculum/official-course-extraction'

interface CurriculumManifest {
  departmentCode: string
  programmeCode: string
  semesterNumber: number
  subjects: Array<{
    officialSubjectCode: string
    name: string
  }>
}

const root = process.cwd()
const manifestRoot = join(root, 'content', 'curriculum', 'cwit-r23')
const outputPath = join(root, 'content', 'curriculum', 'cwit-r23', 'extraction-reports', 'official-structure-candidates.json')
const curriculumTextByDepartment = new Map([
  ['COMP', readFileSync(join(root, 'tmp', 'pdfs', 'official', 'COMP_R23_curriculum.txt'), 'utf8')],
  ['CIOT', readFileSync(join(root, 'tmp', 'pdfs', 'official', 'CIOT_R23_curriculum.txt'), 'utf8')],
])

const reports = findManifestFiles(manifestRoot)
  .map((file) => ({ file, manifest: JSON.parse(readFileSync(file, 'utf8')) as CurriculumManifest }))
  .flatMap(({ file, manifest }) =>
    manifest.subjects.map((subject) =>
      extractSubjectCandidates(file, manifest, subject),
    ),
  )

const payload = {
  generatedAt: new Date().toISOString(),
  status: 'review_only',
  note: 'Course outcome and unit-title candidates are extracted from official PDF text. Promotable rows are still draft manifest data until reviewed/imported; no generated content is published.',
  totals: {
    subjects: reports.length,
    courseBlocksFound: reports.filter((report) => report.extractionStatus !== 'course_block_not_found').length,
    subjectsWithOutcomes: reports.filter((report) => report.candidateOutcomes.length > 0).length,
    subjectsWithUnitCandidates: reports.filter((report) => report.candidateUnits.length > 0).length,
    subjectsWithPromotableUnitCandidates: reports.filter((report) => report.unitQuality.promotable).length,
    structurePromotable: reports.filter((report) => report.extractionStatus === 'structure_promotable').length,
  },
  subjects: reports,
}

mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
console.warn(`[curriculum-extract] wrote ${reports.length} subject report(s) to ${relative(root, outputPath)}`)

function extractSubjectCandidates(
  manifestFile: string,
  manifest: CurriculumManifest,
  subject: CurriculumManifest['subjects'][number],
) {
  const curriculumText = curriculumTextByDepartment.get(manifest.departmentCode)
  if (!curriculumText) {
    return {
      manifest: relative(root, manifestFile).replaceAll('\\', '/'),
      departmentCode: manifest.departmentCode,
      programmeCode: manifest.programmeCode,
      semesterNumber: manifest.semesterNumber,
      officialSubjectCode: subject.officialSubjectCode,
      subjectName: subject.name,
      sourcePages: [],
      candidateOutcomes: [],
      candidateUnits: [],
      unitQuality: {
        promotable: false,
        blockers: ['No curriculum text was available for this department.'],
      },
      extractionStatus: 'missing_curriculum_text',
    }
  }

  const structure = extractOfficialCourseStructure(curriculumText, subject.officialSubjectCode)
  return {
    manifest: relative(root, manifestFile).replaceAll('\\', '/'),
    departmentCode: manifest.departmentCode,
    programmeCode: manifest.programmeCode,
    semesterNumber: manifest.semesterNumber,
    officialSubjectCode: subject.officialSubjectCode,
    subjectName: subject.name,
    sourcePages: structure.sourcePages,
    candidateOutcomes: structure.candidateOutcomes,
    candidateUnits: structure.candidateUnits,
    unitQuality: structure.unitQuality,
    extractionStatus: structure.extractionStatus,
  }
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

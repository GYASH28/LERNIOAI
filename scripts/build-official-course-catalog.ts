import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { extractOfficialCourseCatalog } from '../src/lib/curriculum/official-course-extraction'

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
const outputPath = join(
  root,
  'content',
  'curriculum',
  'cwit-r23',
  'extraction-reports',
  'official-course-catalog.json',
)

const catalogEntries = [
  ...extractOfficialCourseCatalog(
    readFileSync(join(root, 'tmp', 'pdfs', 'official', 'COMP_R23_curriculum.txt'), 'utf8'),
    'COMP',
  ),
  ...extractOfficialCourseCatalog(
    readFileSync(join(root, 'tmp', 'pdfs', 'official', 'CIOT_R23_curriculum.txt'), 'utf8'),
    'CIOT',
  ),
]

const manifestFiles = findManifestFiles(manifestRoot)
const manifestRecords = manifestFiles.map((file) => ({
  file,
  manifest: JSON.parse(readFileSync(file, 'utf8')) as CurriculumManifest,
}))
const manifestSubjects = manifestRecords.flatMap(({ file, manifest }) =>
  manifest.subjects.map((subject) => ({
    departmentCode: manifest.departmentCode,
    programmeCode: manifest.programmeCode,
    semesterNumber: manifest.semesterNumber,
    officialSubjectCode: subject.officialSubjectCode,
    subjectName: subject.name,
    manifest: relative(root, file).replaceAll('\\', '/'),
  })),
)
const manifestCodeSet = new Set(manifestSubjects.map((subject) => subject.officialSubjectCode))
const unplacedOfficialCourses = catalogEntries
  .filter((entry) => !manifestCodeSet.has(entry.courseCode))
  .map((entry) => ({
    ...entry,
    placementStatus: 'official_course_unplaced_in_local_manifest',
    publicationStatus: 'blocked_until_official_semester_manifest',
  }))

const payload = {
  generatedAt: new Date().toISOString(),
  status: 'review_only',
  note: 'Official course catalog entries are extracted from official curriculum PDF course blocks. They identify source-backed course codes/names but do not assign semester placement.',
  totals: {
    officialCourses: catalogEntries.length,
    manifestSubjectCodes: manifestCodeSet.size,
    unplacedOfficialCourses: unplacedOfficialCourses.length,
    compUnplacedOfficialCourses: unplacedOfficialCourses.filter((entry) => entry.departmentCode === 'COMP').length,
    ciotUnplacedOfficialCourses: unplacedOfficialCourses.filter((entry) => entry.departmentCode === 'CIOT').length,
  },
  catalogEntries,
  manifestSubjects,
  unplacedOfficialCourses,
}

mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
console.warn(
  `[course-catalog] wrote ${catalogEntries.length} official course(s), ` +
  `${unplacedOfficialCourses.length} unplaced to ${relative(root, outputPath).replaceAll('\\', '/')}`,
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

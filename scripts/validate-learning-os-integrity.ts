import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, join, relative } from 'node:path'

interface LessonRecord {
  slug?: unknown
  title?: unknown
  durationMin?: unknown
  overview?: unknown
  practiceQuestions?: unknown
}

interface UnitRecord {
  number?: unknown
  title?: unknown
  lessons?: unknown
}

interface NotesRecord {
  subjectCode?: unknown
  subjectName?: unknown
  semester?: unknown
  units?: unknown
}

interface ManifestSubjectRecord {
  officialSubjectCode?: unknown
  name?: unknown
  units?: unknown
}

interface ManifestRecord {
  programmeCode?: unknown
  semesterNumber?: unknown
  subjects?: unknown
}

interface OfficialCourseContentRecord {
  subjects?: Array<{
    subjectCode?: unknown
    subjectName?: unknown
    units?: Array<{ curriculumContent?: unknown; learningOutcomes?: unknown }>
    courseOutcomes?: unknown
  }>
}

interface VideoMappingRecord {
  subjectCode?: unknown
  lessonSlug?: unknown
  videoId?: unknown
  title?: unknown
  reviewStatus?: unknown
}

interface VideoCatalogRecord {
  mappings?: unknown
}

interface LessonIndexEntry {
  subjectCode: string
  lessonSlug: string
  normalizedSlug: string
  file: string
}

const root = process.cwd()
const notesRoot = join(root, 'content', 'lesson-notes')
const manifestsRoot = join(root, 'content', 'curriculum', 'cwit-r23')
const videoCatalogPath = join(
  root,
  'content',
  'resources',
  'lesson-video-mappings',
  'cwit-r23-direct-video-mappings.json',
)
const officialCourseContentPath = join(
  root,
  'content',
  'curriculum',
  'cwit-r23',
  'official-course-content.json',
)

const errors: string[] = []
const warnings: string[] = []
const notices: string[] = []
const notesSubjects = new Map<string, string>()
const lessonIndex = new Map<string, LessonIndexEntry>()
const lessonKeys = new Set<string>()
const manifestSubjects = new Map<string, string>()
const officialSourceSubjects = new Set<string>()
const programmeSemesters = new Map<string, Set<number>>()
let lessonCount = 0
let approvedVideoCount = 0

validateNotes()
validateManifests()
validateOfficialCourseContent()
validateVideoCatalog()
validateCoverage()

console.warn(
  `[learning-os] Checked ${notesSubjects.size} note subjects, ${lessonCount} lessons, ` +
    `${manifestSubjects.size} curriculum subjects and ${approvedVideoCount} approved lesson videos.`,
)

if (warnings.length > 0) {
  console.warn(`[learning-os] ${warnings.length} warning(s):`)
  for (const warning of warnings) console.warn(`- ${warning}`)
}

if (notices.length > 0) {
  console.warn(`[learning-os] ${notices.length} note(s):`)
  for (const notice of notices) console.warn(`- ${notice}`)
}

if (errors.length > 0) {
  console.error(`[learning-os] ${errors.length} integrity error(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.warn('[learning-os] Integrity gate passed.')

function validateNotes() {
  if (!existsSync(notesRoot)) {
    errors.push('content/lesson-notes is missing.')
    return
  }

  const files = readdirSync(notesRoot)
    .filter((file) => file.endsWith('.json'))
    .map((file) => join(notesRoot, file))
    .sort()

  if (files.length === 0) {
    errors.push('content/lesson-notes contains no JSON files.')
    return
  }

  for (const file of files) {
    const label = relative(root, file).replaceAll('\\', '/')
    const notes = readJson<NotesRecord>(file, label)
    if (!notes) continue

    const subjectCode = requiredString(notes.subjectCode, `${label}.subjectCode`)
    requiredString(notes.subjectName, `${label}.subjectName`)
    const semester = integerInRange(notes.semester, 1, 6, `${label}.semester`)

    if (!subjectCode) continue
    const normalizedSubjectCode = normalizeSubjectCode(subjectCode)
    const existingFile = notesSubjects.get(normalizedSubjectCode)
    if (existingFile) {
      errors.push(
        `${label}.subjectCode duplicates ${subjectCode} already loaded from ${existingFile}; ` +
          'the runtime loader would silently overwrite one file.',
      )
    } else {
      notesSubjects.set(normalizedSubjectCode, label)
    }

    if (!Array.isArray(notes.units)) {
      errors.push(`${label}.units must be an array.`)
      continue
    }

    if (notes.units.length === 0) warnings.push(`${label} has no units.`)
    const unitNumbers = new Set<number>()
    const normalizedSlugs = new Map<string, string>()

    for (const [unitIndex, rawUnit] of notes.units.entries()) {
      const unitPath = `${label}.units[${unitIndex}]`
      if (!isRecord(rawUnit)) {
        errors.push(`${unitPath} must be an object.`)
        continue
      }
      const unit = rawUnit as UnitRecord
      const unitNumber = positiveInteger(unit.number, `${unitPath}.number`)
      requiredString(unit.title, `${unitPath}.title`)
      if (unitNumber !== null) {
        if (unitNumbers.has(unitNumber)) errors.push(`${unitPath}.number duplicates unit ${unitNumber}.`)
        unitNumbers.add(unitNumber)
      }

      if (!Array.isArray(unit.lessons)) {
        errors.push(`${unitPath}.lessons must be an array.`)
        continue
      }
      if (unit.lessons.length === 0) warnings.push(`${unitPath} has no lessons.`)

      for (const [lessonIndexInUnit, rawLesson] of unit.lessons.entries()) {
        const lessonPath = `${unitPath}.lessons[${lessonIndexInUnit}]`
        if (!isRecord(rawLesson)) {
          errors.push(`${lessonPath} must be an object.`)
          continue
        }
        const lesson = rawLesson as LessonRecord
        const slug = requiredString(lesson.slug, `${lessonPath}.slug`)
        requiredString(lesson.title, `${lessonPath}.title`)
        positiveInteger(lesson.durationMin, `${lessonPath}.durationMin`)
        const overview = requiredString(lesson.overview, `${lessonPath}.overview`, false)
        if (!overview) warnings.push(`${lessonPath}.overview is empty; the lesson card will feel unfinished.`)
        validatePracticeQuestions(lesson.practiceQuestions, `${lessonPath}.practiceQuestions`)

        if (!slug) continue
        lessonCount += 1
        const normalizedSlug = normalizeSlug(slug)
        if (!normalizedSlug) {
          errors.push(`${lessonPath}.slug cannot produce a safe route.`)
          continue
        }
        if (slug !== normalizedSlug) {
          warnings.push(`${lessonPath}.slug should be canonicalised from "${slug}" to "${normalizedSlug}".`)
        }
        const previousSlug = normalizedSlugs.get(normalizedSlug)
        if (previousSlug) {
          errors.push(
            `${lessonPath}.slug collides with "${previousSlug}" after normalisation; ` +
              'both URLs would resolve to the same lesson.',
          )
        } else {
          normalizedSlugs.set(normalizedSlug, slug)
        }

        const key = `${normalizedSubjectCode}:${normalizedSlug}`
        lessonKeys.add(key)
        lessonIndex.set(key, {
          subjectCode: normalizedSubjectCode,
          lessonSlug: slug,
          normalizedSlug,
          file: label,
        })
      }
    }

    if (semester === null) warnings.push(`${label} is excluded from semester coverage because its semester is invalid.`)
  }
}

function validateManifests() {
  if (!existsSync(manifestsRoot)) {
    errors.push('content/curriculum/cwit-r23 is missing.')
    return
  }

  const files = findFiles(manifestsRoot, (name) => /^semester-\d+\.json$/.test(name))
  if (files.length === 0) {
    errors.push('No CWIT R23 semester manifests were found.')
    return
  }

  for (const file of files) {
    const label = relative(root, file).replaceAll('\\', '/')
    const manifest = readJson<ManifestRecord>(file, label)
    if (!manifest) continue

    const programmeCode = requiredString(manifest.programmeCode, `${label}.programmeCode`)
    const semesterNumber = integerInRange(manifest.semesterNumber, 1, 6, `${label}.semesterNumber`)
    if (programmeCode && semesterNumber !== null) {
      const normalizedProgramme = programmeCode.trim().toUpperCase()
      const semesters = programmeSemesters.get(normalizedProgramme) ?? new Set<number>()
      if (semesters.has(semesterNumber)) {
        errors.push(`${label} duplicates semester ${semesterNumber} for programme ${normalizedProgramme}.`)
      }
      semesters.add(semesterNumber)
      programmeSemesters.set(normalizedProgramme, semesters)
    }

    if (!Array.isArray(manifest.subjects)) {
      errors.push(`${label}.subjects must be an array.`)
      continue
    }

    for (const [subjectIndex, rawSubject] of manifest.subjects.entries()) {
      const subjectPath = `${label}.subjects[${subjectIndex}]`
      if (!isRecord(rawSubject)) {
        errors.push(`${subjectPath} must be an object.`)
        continue
      }
      const subject = rawSubject as ManifestSubjectRecord
      const subjectCode = requiredString(subject.officialSubjectCode, `${subjectPath}.officialSubjectCode`)
      requiredString(subject.name, `${subjectPath}.name`)
      if (!Array.isArray(subject.units)) errors.push(`${subjectPath}.units must be an array.`)
      if (!subjectCode) continue

      const normalizedSubjectCode = normalizeSubjectCode(subjectCode)
      const existing = manifestSubjects.get(normalizedSubjectCode)
      if (existing && existing !== label) {
        warnings.push(`${subjectPath} repeats ${subjectCode}, previously declared in ${existing}.`)
      } else {
        manifestSubjects.set(normalizedSubjectCode, label)
      }
    }
  }

  for (const [programmeCode, semesters] of programmeSemesters.entries()) {
    const missing = [1, 2, 3, 4, 5, 6].filter((semester) => !semesters.has(semester))
    if (missing.length > 0) {
      errors.push(
        `Programme ${programmeCode} is missing semester manifest${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}.`,
      )
    }
  }
}

function validateVideoCatalog() {
  if (!existsSync(videoCatalogPath)) {
    warnings.push(
      'Direct lesson-video catalogue is missing. Lessons will correctly show the no-video state until reviewed mappings are generated.',
    )
    return
  }

  const label = relative(root, videoCatalogPath).replaceAll('\\', '/')
  const catalog = readJson<VideoCatalogRecord>(videoCatalogPath, label)
  if (!catalog) return
  if (!Array.isArray(catalog.mappings)) {
    errors.push(`${label}.mappings must be an array.`)
    return
  }

  const mappingKeys = new Set<string>()
  const subjectVideoIds = new Map<string, string>()

  for (const [index, rawMapping] of catalog.mappings.entries()) {
    const mappingPath = `${label}.mappings[${index}]`
    if (!isRecord(rawMapping)) {
      errors.push(`${mappingPath} must be an object.`)
      continue
    }
    const mapping = rawMapping as VideoMappingRecord
    const reviewStatus = requiredString(mapping.reviewStatus, `${mappingPath}.reviewStatus`)
    if (reviewStatus !== 'approved' && reviewStatus !== 'approved_auto') continue

    approvedVideoCount += 1
    const subjectCode = requiredString(mapping.subjectCode, `${mappingPath}.subjectCode`)
    const lessonSlug = requiredString(mapping.lessonSlug, `${mappingPath}.lessonSlug`)
    const videoId = requiredString(mapping.videoId, `${mappingPath}.videoId`)
    requiredString(mapping.title, `${mappingPath}.title`)
    if (!subjectCode || !lessonSlug || !videoId) continue
    if (!/^[\w-]{11}$/.test(videoId)) errors.push(`${mappingPath}.videoId must be an 11-character YouTube video ID.`)

    const normalizedSubjectCode = normalizeSubjectCode(subjectCode)
    const normalizedLessonSlug = normalizeSlug(lessonSlug)
    const mappingKey = `${normalizedSubjectCode}:${normalizedLessonSlug}`
    if (mappingKeys.has(mappingKey)) {
      errors.push(`${mappingPath} duplicates the approved mapping for ${mappingKey}.`)
    }
    mappingKeys.add(mappingKey)

    const subjectVideoKey = `${normalizedSubjectCode}:${videoId}`
    const previousLesson = subjectVideoIds.get(subjectVideoKey)
    if (previousLesson && previousLesson !== normalizedLessonSlug) {
      errors.push(
        `${mappingPath} reuses video ${videoId} for ${previousLesson} and ${normalizedLessonSlug} in ${normalizedSubjectCode}.`,
      )
    } else {
      subjectVideoIds.set(subjectVideoKey, normalizedLessonSlug)
    }

    if (!lessonKeys.has(mappingKey)) {
      errors.push(
        `${mappingPath} is approved but does not match an exact lesson route. ` +
          'Fix the subject code or lesson slug before exposing it to students.',
      )
    }
  }
}

function validateOfficialCourseContent() {
  if (!existsSync(officialCourseContentPath)) {
    errors.push('Official CWIT course-content extraction is missing.')
    return
  }

  const label = relative(root, officialCourseContentPath).replaceAll('\\', '/')
  const payload = readJson<OfficialCourseContentRecord>(officialCourseContentPath, label)
  if (!payload || !Array.isArray(payload.subjects)) {
    errors.push(`${label}.subjects must be an array.`)
    return
  }

  const subjectsWithUnitTables = new Set(
    payload.subjects
      .filter((subject) => Array.isArray(subject.units) && subject.units.length > 0)
      .map((subject) => normalizeCourseName(typeof subject.subjectName === 'string' ? subject.subjectName : '')),
  )

  for (const [index, subject] of payload.subjects.entries()) {
    const subjectPath = `${label}.subjects[${index}]`
    const subjectCode = requiredString(subject.subjectCode, `${subjectPath}.subjectCode`)
    if (!subjectCode) continue
    const normalizedCode = normalizeSubjectCode(subjectCode)
    officialSourceSubjects.add(normalizedCode)
    if (!Array.isArray(subject.units) || subject.units.length === 0) {
      const courseOutcomes = Array.isArray(subject.courseOutcomes)
        ? subject.courseOutcomes.filter((outcome) =>
          typeof outcome === 'object' && outcome !== null && typeof (outcome as { text?: unknown }).text === 'string' && Boolean((outcome as { text: string }).text.trim()),
        ).length
        : 0
      if (courseOutcomes > 0) {
        notices.push(`${subjectCode} has no official unit table; runtime exposes its ${courseOutcomes} official course-level outcome(s) without inventing units.`)
      } else if (subjectsWithUnitTables.has(normalizeCourseName(typeof subject.subjectName === 'string' ? subject.subjectName : ''))) {
        notices.push(`${subjectCode} uses a matching CWIT shared-course unit table from the companion programme; runtime labels that evidence explicitly.`)
      } else {
        warnings.push(`${subjectCode} has no official unit or course-outcome table; runtime shows an explicit source-availability state instead of invented notes.`)
      }
      continue
    }
    for (const [unitIndex, unit] of subject.units.entries()) {
      const unitPath = `${subjectPath}.units[${unitIndex}]`
      const scope = typeof unit.curriculumContent === 'string' ? unit.curriculumContent.trim() : ''
      const outcomes = Array.isArray(unit.learningOutcomes)
        ? unit.learningOutcomes.filter((outcome) => typeof outcome === 'string' && outcome.trim()).length
        : 0
      if (!scope) errors.push(`${unitPath}.curriculumContent is empty.`)
      if (outcomes === 0) errors.push(`${unitPath}.learningOutcomes has no official outcome.`)
    }
  }
}

function normalizeCourseName(value: string) {
  return value
    .toLowerCase()
    .replace(/\b(and|its|it)\b/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

function validateCoverage() {
  for (const [subjectCode, manifestFile] of manifestSubjects.entries()) {
    if (!notesSubjects.has(subjectCode)) {
      if (officialSourceSubjects.has(subjectCode)) {
        notices.push(`${subjectCode} uses the verified official-course runtime notes rather than a legacy JSON pack.`)
      } else {
        warnings.push(`${subjectCode} is declared in ${manifestFile} but has no detailed lesson-notes document or official source-backed fallback.`)
      }
    }
  }

  for (const [subjectCode, notesFile] of notesSubjects.entries()) {
    if (!manifestSubjects.has(subjectCode)) {
      warnings.push(`${subjectCode} has notes in ${notesFile} but is not declared in a CWIT R23 manifest.`)
    }
  }
}

function validatePracticeQuestions(value: unknown, path: string) {
  if (value === undefined) return
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array when present.`)
    return
  }

  for (const [index, rawQuestion] of value.entries()) {
    const questionPath = `${path}[${index}]`
    if (!isRecord(rawQuestion)) {
      errors.push(`${questionPath} must be an object.`)
      continue
    }
    const options = rawQuestion.options
    const answer = rawQuestion.answer
    if (!Array.isArray(options) || options.length < 2 || options.some((option) => typeof option !== 'string')) {
      errors.push(`${questionPath}.options must contain at least two strings.`)
      continue
    }
    if (!Number.isInteger(answer) || Number(answer) < 0 || Number(answer) >= options.length) {
      errors.push(`${questionPath}.answer must be a valid zero-based option index.`)
    }
  }
}

function findFiles(dir: string, predicate: (name: string) => boolean): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    if (statSync(fullPath).isDirectory()) out.push(...findFiles(fullPath, predicate))
    else if (predicate(entry)) out.push(fullPath)
  }
  return out.sort()
}

function readJson<T>(file: string, label: string): T | null {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as T
  } catch (error) {
    errors.push(`${label}: ${error instanceof Error ? error.message : String(error)}`)
    return null
  }
}

function requiredString(value: unknown, path: string, reportError = true): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    if (reportError) errors.push(`${path} must be a non-empty string.`)
    return null
  }
  return value.trim()
}

function positiveInteger(value: unknown, path: string): number | null {
  if (!Number.isInteger(value) || Number(value) <= 0) {
    errors.push(`${path} must be a positive integer.`)
    return null
  }
  return Number(value)
}

function integerInRange(value: unknown, min: number, max: number, path: string): number | null {
  if (!Number.isInteger(value) || Number(value) < min || Number(value) > max) {
    errors.push(`${path} must be an integer from ${min} to ${max}.`)
    return null
  }
  return Number(value)
}

function normalizeSubjectCode(value: string): string {
  return value.trim().toUpperCase()
}

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

void basename

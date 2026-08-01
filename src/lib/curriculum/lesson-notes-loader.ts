/**
 * Loads lesson notes from JSON files in content/lesson-notes/.
 * Returns structured notes with units, lessons, and quiz questions.
 */
import 'server-only'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const NOTES_DIR = join(process.cwd(), 'content', 'lesson-notes')
const OFFICIAL_COURSE_CONTENT_PATH = join(
  process.cwd(),
  'content',
  'curriculum',
  'cwit-r23',
  'official-course-content.json',
)

let cache: Map<string, SubjectNotes> | null = null
let officialCache: Map<string, SubjectNotes> | null = null

export interface PracticeQuestion {
  question: string
  options: string[]
  answer: number
  explanation: string
}

export interface CodeExample {
  language: string
  title: string
  code: string
  explanation: string
}

export interface DataTable {
  title: string
  headers: string[]
  rows: string[][]
  note?: string
}

export interface Diagram {
  type: string
  title: string
  content: string
}

export interface MarkedQuestion {
  marks: number
  question: string
  modelAnswer?: string
  tips?: string[]
}

export interface Mnemonic {
  phrase: string
  expansion: string
  meaning: string
}

export interface Flashcard {
  front: string
  back: string
  hint?: string
}

export interface Callout {
  type: string
  title?: string
  content: string
}

export interface ComplexityAnalysis {
  time: string
  space: string
  explanation?: string
}

export interface WorkedExample {
  title: string
  problem: string
  solution: string
  explanation?: string
}

export interface RealLifeAnalogy {
  scenario: string
  mapping: string
}

export interface AISummary {
  style: string
  content: string
}

export interface Lesson {
  slug: string
  title: string
  durationMin: number
  difficulty: string
  overview: string
  keyConcepts: string[]
  formulas: string[]
  tables: DataTable[]
  diagrams: Diagram[]
  codeExamples: CodeExample[]
  commonMistakes: string[]
  examTips: string[]
  practiceQuestions: PracticeQuestion[]
  objectives?: string[]
  prerequisites?: string[]
  theory?: string
  analogies?: Array<{ scenario: string; mapping: string }>
  flowcharts?: Diagram[]
  mindMaps?: Diagram[]
  complexity?: { time: string; space: string; explanation?: string }
  workedExamples?: Array<{ title: string; problem: string; solution: string; explanation?: string }>
  vivaQuestions?: Array<{ marks: number; question: string; modelAnswer?: string }>
  interviewQuestions?: Array<{ marks: number; question: string; modelAnswer?: string }>
  examQuestions?: Array<{ marks: number; question: string; modelAnswer?: string; tips?: string[] }>
  revisionSummary?: string
  cheatSheet?: string[]
  mnemonics?: Array<{ phrase: string; expansion: string; meaning: string }>
  callouts?: Array<{ type: string; title?: string; content: string }>
  flashcards?: Array<{ front: string; back: string; hint?: string }>
  aiSummaries?: Array<{ style: string; content: string }>
  recommendedNextLessons?: string[]
}

export interface Unit {
  number: number
  title: string
  weightage: number
  lessons: Lesson[]
}

export interface SubjectNotes {
  subjectCode: string
  subjectName: string
  semester: number
  credits: number
  units: Unit[]
  revisionNotes?: string
  interviewBank?: MarkedQuestion[]
  vivaBank?: MarkedQuestion[]
  pyqBank?: MarkedQuestion[]
}

function loadAllNotes(): Map<string, SubjectNotes> {
  if (cache) return cache
  cache = new Map()

  if (!existsSync(NOTES_DIR)) return cache

  const files = readdirSync(NOTES_DIR).filter((file) => file.endsWith('.json'))
  for (const file of files) {
    try {
      const raw = readFileSync(join(NOTES_DIR, file), 'utf-8')
      const notes = JSON.parse(raw) as SubjectNotes
      cache.set(notes.subjectCode, notes)
      cache.set(notes.subjectCode.trim().toUpperCase(), notes)
    } catch {
      // Corrupt or incomplete content must not break every lesson page.
    }
  }

  return cache
}

export function getSubjectNotes(subjectCode: string): SubjectNotes | null {
  const notes = loadAllNotes()
  const normalized = subjectCode.trim().toUpperCase()
  return notes.get(subjectCode)
    ?? notes.get(normalized)
    ?? loadOfficialCourseNotes().get(normalized)
    ?? null
}

export function getAvailableNotesSubjects(): { code: string; name: string }[] {
  const unique = new Map<string, SubjectNotes>()
  for (const notes of loadAllNotes().values()) unique.set(notes.subjectCode, notes)
  for (const notes of loadOfficialCourseNotes().values()) {
    if (!unique.has(notes.subjectCode)) unique.set(notes.subjectCode, notes)
  }
  return Array.from(unique.values()).map((notes) => ({ code: notes.subjectCode, name: notes.subjectName }))
}

interface OfficialCourseContentFile {
  subjects: OfficialCourseSubject[]
}

export interface OfficialCourseSubject {
  subjectCode: string
  subjectName: string
  semesterNumber: number
  credits?: number
  sourceUrl: string
  courseOutcomes?: Array<{ code?: string; text?: string }>
  units: Array<{
    order: number
    title: string
    curriculumContent: string
    learningOutcomes?: string[]
    teachingHours?: string | null
    theoryMarks?: string | null
    mappedCourseOutcome?: string | null
    sourcePages?: number[]
    extractionStatus: string
  }>
}

function loadOfficialCourseNotes(): Map<string, SubjectNotes> {
  if (officialCache) return officialCache
  officialCache = new Map()
  if (!existsSync(OFFICIAL_COURSE_CONTENT_PATH)) return officialCache

  try {
    const payload = JSON.parse(readFileSync(OFFICIAL_COURSE_CONTENT_PATH, 'utf8')) as OfficialCourseContentFile
    for (const subject of payload.subjects ?? []) {
      const notes = buildOfficialSubjectNotes(subject)
      officialCache.set(notes.subjectCode.trim().toUpperCase(), notes)
    }
  } catch {
    // A broken extraction must not hide the richer reviewed notes that load above.
  }
  return officialCache
}

export function buildOfficialSubjectNotes(subject: OfficialCourseSubject): SubjectNotes {
  const courseOutcomes = (subject.courseOutcomes ?? [])
    .map((outcome) => outcome.text?.trim())
    .filter((value): value is string => Boolean(value))

  return {
    subjectCode: subject.subjectCode,
    subjectName: subject.subjectName,
    semester: subject.semesterNumber,
    credits: subject.credits ?? 0,
    units: subject.units.map((unit) => {
      const keyConcepts = curriculumConcepts(unit.curriculumContent, unit.title)
      const objectives = (unit.learningOutcomes ?? []).length > 0
        ? unit.learningOutcomes ?? []
        : courseOutcomes
      const sourceLabel = `Official CWIT R23 curriculum${unit.sourcePages?.length ? `, pages ${unit.sourcePages.join(', ')}` : ''}`
      const scope = unit.curriculumContent.trim()

      return {
        number: unit.order,
        title: unit.title,
        weightage: numericValue(unit.theoryMarks),
        lessons: [{
          slug: officialLessonSlug(unit.order, unit.title),
          title: unit.title,
          durationMin: 30,
          difficulty: 'curriculum',
          overview: scope
            ? `Official CWIT R23 scope for ${unit.title} in ${subject.subjectName}.`
            : `${unit.title} is listed in the official CWIT R23 curriculum; detailed topic extraction is awaiting review.`,
          keyConcepts,
          formulas: [],
          tables: [],
          diagrams: [],
          codeExamples: [],
          commonMistakes: [],
          examTips: [],
          practiceQuestions: [],
          objectives,
          prerequisites: [],
          theory: scope || undefined,
          revisionSummary: keyConcepts.length > 0
            ? `Official revision checklist:\n${keyConcepts.map((concept) => `- ${concept}`).join('\n')}`
            : undefined,
          cheatSheet: keyConcepts,
          callouts: [{
            type: unit.extractionStatus === 'content_extracted' ? 'source' : 'warning',
            title: unit.extractionStatus === 'content_extracted' ? 'Curriculum source' : 'Content review pending',
            content: unit.extractionStatus === 'content_extracted'
              ? `${sourceLabel}. Scope is reproduced from the official topics and learning-outcomes table. Source: ${subject.sourceUrl}`
              : `${sourceLabel}. Lernio is not generating substitute theory for this unit until the official table is reviewed. Source: ${subject.sourceUrl}`,
          }],
        }],
      }
    }),
    revisionNotes: `This fallback is generated only from official CWIT R23 unit topics and learning outcomes. Source: ${subject.sourceUrl}`,
  }
}

function officialLessonSlug(order: number, title: string) {
  const normalized = normalizeLessonSlug(title) || 'official-curriculum-unit'
  return `unit-${order}-${normalized}`
}

function curriculumConcepts(content: string, unitTitle: string): string[] {
  if (!content.trim()) return []
  const normalizedTitle = normalizeLessonSlug(unitTitle)
  const seen = new Set<string>()
  return content
    .split(/\n+|(?=\b\d+\.\d+\s+)/)
    .map((value) => value
      .replace(/^\s*(?:Unit\s*(?:No\.)?\s*)?(?:VI|IV|III|II|I|V|\d+)\s*[-:.]?\s*/i, '')
      .replace(/^\s*\d+\.\d+\s*/, '')
      .trim())
    .filter((value) => value.length >= 3)
    .filter((value) => normalizeLessonSlug(value) !== normalizedTitle)
    .filter((value) => {
      const key = value.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 24)
}

function numericValue(value: string | null | undefined) {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * Strict lesson lookup. We intentionally do not use substring matching because
 * it can route multiple lesson slugs to the same notes and video workspace.
 * A normalised-equality fallback supports legacy punctuation/case differences
 * without accepting unrelated or partial slugs.
 */
export function findLessonBySlug(
  subjectCode: string,
  lessonSlug: string,
): { lesson: Lesson; unit: Unit; subject: SubjectNotes } | null {
  const subject = getSubjectNotes(subjectCode)
  if (!subject) return null

  const exact = findLesson(subject, (slug) => slug === lessonSlug)
  if (exact) return exact

  const normalizedRequested = normalizeLessonSlug(lessonSlug)
  return findLesson(subject, (slug) => normalizeLessonSlug(slug) === normalizedRequested)
}

export function getAdjacentLessons(
  subjectCode: string,
  lessonSlug: string,
): { prev: Lesson | null; next: Lesson | null } {
  const subject = getSubjectNotes(subjectCode)
  if (!subject) return { prev: null, next: null }

  const all = subject.units.flatMap((unit) => unit.lessons)
  let index = all.findIndex((lesson) => lesson.slug === lessonSlug)
  if (index === -1) {
    const normalizedRequested = normalizeLessonSlug(lessonSlug)
    index = all.findIndex((lesson) => normalizeLessonSlug(lesson.slug) === normalizedRequested)
  }
  if (index === -1) return { prev: null, next: null }

  return {
    prev: index > 0 ? all[index - 1] : null,
    next: index < all.length - 1 ? all[index + 1] : null,
  }
}

export function normalizeLessonSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function findLesson(
  subject: SubjectNotes,
  predicate: (slug: string) => boolean,
): { lesson: Lesson; unit: Unit; subject: SubjectNotes } | null {
  for (const unit of subject.units) {
    for (const lesson of unit.lessons) {
      if (predicate(lesson.slug)) return { lesson, unit, subject }
    }
  }
  return null
}

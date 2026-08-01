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
  /** Derived when a legacy subject pack does not record its CWIT programme. */
  programmeCode?: 'DCOMP' | 'DCIOT'
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
  const official = loadOfficialCourseNotes().get(normalized) ?? null
  const detailed = notes.get(subjectCode) ?? notes.get(normalized) ?? null

  // CWIT's extracted R23 table is the student-facing source of truth. Older
  // detailed packs are retained on disk for audit/migration work only: some
  // use a different unit structure and must never expand the official scope.
  // A non-CWIT/custom subject may still use its detailed pack.
  return official ?? (detailed ? {
    ...detailed,
    programmeCode: detailed.programmeCode ?? programmeForSubjectCode(detailed.subjectCode),
  } : null)
}

export function getAvailableNotesSubjects(): { code: string; name: string }[] {
  const unique = new Map<string, SubjectNotes>()
  for (const notes of loadOfficialCourseNotes().values()) unique.set(notes.subjectCode, notes)
  for (const notes of loadAllNotes().values()) if (!unique.has(notes.subjectCode)) unique.set(notes.subjectCode, notes)
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
    const subjects = payload.subjects ?? []
    for (const subject of subjects) {
      const evidenceSubject = subject.units.length > 0
        ? subject
        : subjects.find((candidate) =>
          candidate.units.length > 0 && normalizeCourseName(candidate.subjectName) === normalizeCourseName(subject.subjectName),
        ) ?? subject
      const notes = buildOfficialSubjectNotes(subject, evidenceSubject)
      officialCache.set(notes.subjectCode.trim().toUpperCase(), notes)
    }
  } catch {
    // A broken extraction must not hide the richer reviewed notes that load above.
  }
  return officialCache
}

export function buildOfficialSubjectNotes(
  subject: OfficialCourseSubject,
  evidenceSubject: OfficialCourseSubject = subject,
): SubjectNotes {
  const courseOutcomes = (subject.courseOutcomes?.length ? subject.courseOutcomes : evidenceSubject.courseOutcomes ?? [])
    .map((outcome) => outcome.text?.trim())
    .filter((value): value is string => Boolean(value))

  return {
    subjectCode: subject.subjectCode,
    subjectName: subject.subjectName,
    semester: subject.semesterNumber,
    credits: subject.credits ?? 0,
    programmeCode: programmeForSubjectCode(subject.subjectCode),
    units: evidenceSubject.units.length > 0 ? evidenceSubject.units.map((unit) => {
      const keyConcepts = curriculumConcepts(unit.curriculumContent, unit.title)
      const objectives = (unit.learningOutcomes ?? []).length > 0
        ? unit.learningOutcomes ?? []
        : courseOutcomes
      const sharedEvidence = evidenceSubject.subjectCode !== subject.subjectCode
      const sourceLabel = `${sharedEvidence ? 'Official CWIT R23 shared-course evidence' : 'Official CWIT R23 curriculum'}${unit.sourcePages?.length ? `, pages ${unit.sourcePages.join(', ')}` : ''}`
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
            ? `CWIT R23 Unit ${unit.order} covers the official scope below. Use its outcomes as your mastery checklist.`
            : `${unit.title} is listed in the official CWIT R23 curriculum; detailed topic extraction is awaiting review.`,
          keyConcepts,
          formulas: [],
          tables: [officialCurriculumTable(unit)],
          diagrams: [],
          codeExamples: [],
          commonMistakes: officialCommonMistakes(unit, keyConcepts),
          examTips: officialExamTips(unit, keyConcepts),
          practiceQuestions: officialPracticeQuestions(unit, keyConcepts),
          objectives,
          prerequisites: [],
          theory: buildOfficialStudyGuide(unit, scope),
          revisionSummary: keyConcepts.length > 0
            ? `Official revision checklist:\n${keyConcepts.map((concept) => `- ${concept}`).join('\n')}`
            : undefined,
          cheatSheet: keyConcepts,
          callouts: [{
            type: unit.extractionStatus === 'content_extracted' ? 'source' : 'warning',
            title: unit.extractionStatus === 'content_extracted' ? 'Curriculum source' : 'Content review pending',
            content: unit.extractionStatus === 'content_extracted'
              ? `${sourceLabel}. Scope is reproduced from the official topics and learning-outcomes table. Source: ${evidenceSubject.sourceUrl}`
              : `${sourceLabel}. Lernio is not generating substitute theory for this unit until the official table is reviewed. Source: ${evidenceSubject.sourceUrl}`,
          }],
        }],
      }
    }) : [buildCourseLevelFallback(subject, courseOutcomes)],
    revisionNotes: `This fallback is generated only from official CWIT R23 unit topics and learning outcomes. Source: ${subject.sourceUrl}`,
  }
}

function buildCourseLevelFallback(subject: OfficialCourseSubject, courseOutcomes: string[]): Unit {
  const sourcePages = subject.sourceUrl ? 'See the official CWIT source linked below.' : 'Official source page information is unavailable.'
  const hasOutcomes = courseOutcomes.length > 0
  return {
    number: 1,
    title: 'Official course-level outcomes',
    weightage: 0,
    lessons: [{
      slug: 'official-course-level-outcomes',
      title: 'Official course-level outcomes',
      durationMin: 20,
      difficulty: 'curriculum',
      overview: hasOutcomes
        ? `CWIT publishes course-level outcomes for ${subject.subjectName}. This study card preserves those outcomes without inventing a unit breakdown.`
        : `CWIT lists ${subject.subjectName} in the R23 scheme, but the available official extraction contains no unit or outcome table for this course.`,
      keyConcepts: hasOutcomes ? courseOutcomes : ['Official course-level scope is not available in the extracted CWIT table.'],
      formulas: [],
      tables: [{
        title: 'Official CWIT source status',
        headers: ['Field', 'Status'],
        rows: [
          ['Course outcomes', hasOutcomes ? `${courseOutcomes.length} official outcome(s) recorded` : 'No course outcomes in the extracted table'],
          ['Unit table', 'No official unit table was extracted for this course'],
          ['Source', sourcePages],
        ],
        note: 'Lernio does not invent notes where the official CWIT table has no detailed course content.',
      }],
      diagrams: [],
      codeExamples: [],
      commonMistakes: hasOutcomes
        ? ['Do not replace the official course outcomes with an assumed unit sequence.']
        : ['Do not treat a course title as a complete syllabus. Check the official course/faculty material before preparing detailed notes.'],
      examTips: hasOutcomes
        ? ['Use the official course outcomes as the checklist for planning, evidence and reflection.']
        : ['This course needs additional official detail before Lernio can responsibly provide unit-level theory or videos.'],
      practiceQuestions: [],
      objectives: courseOutcomes,
      prerequisites: [],
      theory: hasOutcomes
        ? `Official CWIT R23 course-level outcomes\n\n${courseOutcomes.map((outcome, index) => `${index + 1}. ${outcome}`).join('\n')}`
        : undefined,
      revisionSummary: hasOutcomes ? `Review each official outcome:\n${courseOutcomes.map((outcome) => `- ${outcome}`).join('\n')}` : undefined,
      cheatSheet: courseOutcomes,
      callouts: [{
        type: hasOutcomes ? 'source' : 'warning',
        title: hasOutcomes ? 'Official course-level source' : 'Official detail unavailable',
        content: hasOutcomes
          ? `These outcomes are taken from the official CWIT R23 curriculum. Source: ${subject.sourceUrl}`
          : `The available official CWIT R23 extraction names this course but does not include a unit/outcome table. Source: ${subject.sourceUrl}`,
      }],
    }],
  }
}

function normalizeCourseName(value: string) {
  return value
    .toLowerCase()
    .replace(/\b(and|its|it)\b/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

function buildOfficialStudyGuide(unit: OfficialCourseSubject['units'][number], scope: string) {
  const cleanScope = normalizeCurriculumText(scope)
  const outcomes = (unit.learningOutcomes ?? []).map(normalizeCurriculumText).filter(Boolean)
  return [
    cleanScope ? `Official CWIT R23 scope\n\n${cleanScope}` : '',
    outcomes.length
      ? `What you must be able to do\n\n${outcomes.map((outcome, index) => `${index + 1}. ${outcome}`).join('\n')}`
      : '',
    unit.teachingHours
      ? `Suggested study allocation\n\nCWIT assigns ${unit.teachingHours} teaching hour${unit.teachingHours === '1' ? '' : 's'} to this unit. Make one pass for vocabulary and scope, one pass for each outcome, and a final recall/practice pass.`
      : '',
  ].filter(Boolean).join('\n\n') || undefined
}

function officialCurriculumTable(unit: OfficialCourseSubject['units'][number]): DataTable {
  return {
    title: 'Official CWIT curriculum alignment',
    headers: ['CWIT field', 'Recorded value'],
    rows: [
      ['Teaching hours', unit.teachingHours ?? 'Not stated in extracted table'],
      ['Theory marks', unit.theoryMarks ?? 'Not stated in extracted table'],
      ['Mapped course outcome', unit.mappedCourseOutcome ?? 'Not stated in extracted table'],
      ['Source pages', unit.sourcePages?.length ? unit.sourcePages.join(', ') : 'See subject source'],
    ],
    note: 'Values are taken from the official CWIT R23 curriculum extraction.',
  }
}

function officialCommonMistakes(unit: OfficialCourseSubject['units'][number], concepts: string[]) {
  return [
    `Do not prepare only from the unit heading. CWIT's official scope also names ${concepts[0] ?? 'specific subtopics'}.`,
    `Check every listed learning outcome before moving on; this unit maps to ${unit.mappedCourseOutcome ?? 'the stated course outcome'}.`,
  ]
}

function officialExamTips(unit: OfficialCourseSubject['units'][number], concepts: string[]) {
  const checklist = concepts.slice(0, 6).join('; ')
  return [
    'Use the learning-outcome verb in your answer (for example: describe, perform, create, or apply) and show the requested result.',
    checklist ? `Before an assessment, self-check these official-scope items: ${checklist}.` : 'Use the official unit scope and learning outcomes as your final revision checklist.',
    unit.theoryMarks ? `CWIT records ${unit.theoryMarks} theory mark${unit.theoryMarks === '1' ? '' : 's'} for this unit; prioritise complete outcome coverage before extra reading.` : 'Prioritise the official outcomes before extra reading.',
  ]
}

function officialPracticeQuestions(unit: OfficialCourseSubject['units'][number], concepts: string[]): PracticeQuestion[] {
  const outcome = (unit.learningOutcomes ?? []).map(normalizeCurriculumText).find(Boolean)
  const concept = concepts[0]
  if (!outcome || !concept) return []
  return [{
    question: `Which task is explicitly expected after studying Unit ${unit.order}?`,
    options: [
      outcome,
      'Memorise only the unit title without using its listed scope.',
      'Skip the official learning outcomes and rely on an unrelated topic.',
      'Treat the course outcome as optional.',
    ],
    answer: 0,
    explanation: `CWIT lists this as a unit learning outcome. The official unit scope begins with ${concept}.`,
  }]
}

function normalizeCurriculumText(value: string) {
  return value.replace(/\s+/g, ' ').replace(/\s*([,;:.])\s*/g, '$1 ').trim()
}

function programmeForSubjectCode(subjectCode: string): 'DCOMP' | 'DCIOT' {
  return /^R23CI/i.test(subjectCode) ? 'DCIOT' : 'DCOMP'
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

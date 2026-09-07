/**
 * Loads rich lesson notes from JSON files in content/lesson-notes/.
 *
 * A note pack is intentionally treated as student-facing content rather than a
 * blind JSON dump: known legacy aliases are resolved to the best canonical
 * pack and obvious generator placeholders are removed before rendering.
 */
import 'server-only'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const NOTES_DIR = join(process.cwd(), 'content', 'lesson-notes')

/**
 * Legacy curriculum codes that were used by the early YouTube-guide manifest.
 * Prefer the current official CWIT R23 code when a stronger canonical pack is
 * available, while keeping old deep-links working.
 */
const NOTE_CODE_ALIASES: Record<string, string> = {
  R23CP5401: 'R23CP1407',
}

const PLACEHOLDER_PATTERNS = [
  /^Option [A-D]$/i,
  /refer to the theory section above/i,
  /this is a sample answer outline/i,
  /core formula:\s*depends on specific topic/i,
  /relationship:\s*connects to/i,
  /result:\s*output depends on input parameters/i,
  /a core concept in /i,
  /which is most important when answering exam questions/i,
  /used in engineering practice/i,
  /only theoretical/i,
  /not used anywhere/i,
  /only in research/i,
]

let cache: Map<string, SubjectNotes> | null = null

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
  title?: string
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
      const notes = sanitizeSubjectNotes(JSON.parse(raw) as SubjectNotes)
      cache.set(notes.subjectCode.toUpperCase(), notes)
    } catch {
      // A corrupt pack must not make the entire learning area unavailable.
      // Content validation should catch the source file during authoring.
    }
  }

  return cache
}

function sanitizeSubjectNotes(subject: SubjectNotes): SubjectNotes {
  return {
    ...subject,
    subjectCode: subject.subjectCode.toUpperCase(),
    units: subject.units.map((unit) => ({
      ...unit,
      lessons: unit.lessons.map(sanitizeLesson),
    })),
  }
}

function sanitizeLesson(lesson: Lesson): Lesson {
  const practiceQuestions = (lesson.practiceQuestions ?? []).filter((question) => {
    if (isPlaceholderText(question.question) || isPlaceholderText(question.explanation)) return false
    if (question.options.length < 2) return false
    if (question.options.some(isPlaceholderText)) return false
    return Number.isInteger(question.answer) && question.answer >= 0 && question.answer < question.options.length
  })

  const workedExamples = lesson.workedExamples?.filter((example) => {
    return !isPlaceholderText(example.problem) && !isPlaceholderText(example.solution) && !isPlaceholderText(example.explanation ?? '')
  })

  const formulas = (lesson.formulas ?? []).filter((formula) => !isPlaceholderText(formula))

  return {
    ...lesson,
    formulas,
    practiceQuestions,
    ...(workedExamples ? { workedExamples } : {}),
  }
}

function isPlaceholderText(value: string): boolean {
  const text = value.trim()
  if (!text) return false
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(text))
}

/** Get lesson notes for a subject, resolving known legacy curriculum aliases. */
export function getSubjectNotes(subjectCode: string): SubjectNotes | null {
  const notes = loadAllNotes()
  const normalized = subjectCode.toUpperCase()
  const canonical = NOTE_CODE_ALIASES[normalized] ?? normalized
  return notes.get(canonical) ?? notes.get(normalized) ?? null
}

/** Get canonical subjects that have rich lesson notes available. */
export function getAvailableNotesSubjects(): { code: string; name: string }[] {
  const notes = loadAllNotes()
  return Array.from(notes.entries())
    .filter(([code]) => !NOTE_CODE_ALIASES[code])
    .map(([, note]) => ({ code: note.subjectCode, name: note.subjectName }))
}

/** Find a specific lesson by slug within a subject's notes. */
export function findLessonBySlug(
  subjectCode: string,
  lessonSlug: string,
): { lesson: Lesson; unit: Unit; subject: SubjectNotes } | null {
  const subject = getSubjectNotes(subjectCode)
  if (!subject) return null

  for (const unit of subject.units) {
    for (const lesson of unit.lessons) {
      if (
        lesson.slug === lessonSlug ||
        lesson.slug.includes(lessonSlug) ||
        lessonSlug.includes(lesson.slug)
      ) {
        return { lesson, unit, subject }
      }
    }
  }
  return null
}

/** Get the previous and next lessons for reader navigation. */
export function getAdjacentLessons(
  subjectCode: string,
  lessonSlug: string,
): { prev: Lesson | null; next: Lesson | null } {
  const subject = getSubjectNotes(subjectCode)
  if (!subject) return { prev: null, next: null }

  const all = subject.units.flatMap((unit) => unit.lessons)
  const index = all.findIndex(
    (lesson) =>
      lesson.slug === lessonSlug ||
      lesson.slug.includes(lessonSlug) ||
      lessonSlug.includes(lesson.slug),
  )

  if (index === -1) return { prev: null, next: null }
  return {
    prev: index > 0 ? all[index - 1] : null,
    next: index < all.length - 1 ? all[index + 1] : null,
  }
}

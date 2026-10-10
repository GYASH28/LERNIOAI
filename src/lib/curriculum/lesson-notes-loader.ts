/**
 * Loads lesson notes from JSON files in content/lesson-notes/.
 * Returns structured notes with units, lessons, and quiz questions.
 */
import 'server-only'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const NOTES_DIR = join(process.cwd(), 'content', 'lesson-notes')

let cache: Map<string, SubjectNotes> | null = null

const SUBJECT_NOTE_ALIASES: Record<
  string,
  { sourceCode: string; subjectName: string; semester: number; credits: number }
> = {
  // CIoT Semester 3 subjects whose verified unit structure matches the
  // corresponding Computer Engineering R23 subject. Keep this explicit so
  // curriculum differences never get hidden behind fuzzy code matching.
  R23CI2602: {
    sourceCode: 'R23CP2402',
    subjectName: 'Data Structures',
    semester: 3,
    credits: 4,
  },
  R23CI6604: {
    sourceCode: 'R23CP6404',
    subjectName: 'Object Oriented Programming With C++',
    semester: 3,
    credits: 3,
  },
  R23CI2605: {
    sourceCode: 'R23CP2405',
    subjectName: 'User Interface Programming',
    semester: 3,
    credits: 2,
  },
  R23CI1602: {
    sourceCode: 'R23CP1402',
    subjectName: 'Animation Techniques',
    semester: 3,
    credits: 4,
  },
  R23CI4602: {
    sourceCode: 'R23CP4402',
    subjectName: 'Indian Constitution',
    semester: 3,
    credits: 1,
  },
}

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
  // V3 optional fields (may not exist in all JSON files)
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

  const files = readdirSync(NOTES_DIR).filter((f) => f.endsWith('.json'))
  for (const file of files) {
    try {
      const raw = readFileSync(join(NOTES_DIR, file), 'utf-8')
      const notes = JSON.parse(raw) as SubjectNotes
      // Index by subject code (both COMP and CIOT variants)
      cache.set(notes.subjectCode, notes)
    } catch {
      // skip corrupt files
    }
  }

  return cache
}

/**
 * Get lesson notes for a subject by its exact curriculum code.
 */
export function getSubjectNotes(subjectCode: string): SubjectNotes | null {
  const notes = loadAllNotes()
  const direct = notes.get(subjectCode)
  if (direct) return direct

  const alias = SUBJECT_NOTE_ALIASES[subjectCode]
  if (!alias) return null
  const source = notes.get(alias.sourceCode)
  if (!source) return null

  return {
    ...source,
    subjectCode,
    subjectName: alias.subjectName,
    semester: alias.semester,
    credits: alias.credits,
  }
}

/**
 * Get all subjects that have lesson notes available.
 */
export function getAvailableNotesSubjects(): { code: string; name: string }[] {
  return getAvailableSubjectNotes().map((notes) => ({
    code: notes.subjectCode,
    name: notes.subjectName,
  }))
}

/**
 * Full detailed-note catalog for server-rendered materials pages.
 * A shallow copy keeps callers from mutating the cached map values.
 */
export function getAvailableSubjectNotes(): SubjectNotes[] {
  const notes = loadAllNotes()
  const available = Array.from(notes.values())

  for (const [subjectCode, alias] of Object.entries(SUBJECT_NOTE_ALIASES)) {
    if (notes.has(subjectCode)) continue
    const source = notes.get(alias.sourceCode)
    if (!source) continue
    available.push({
      ...source,
      subjectCode,
      subjectName: alias.subjectName,
      semester: alias.semester,
      credits: alias.credits,
    })
  }

  return available.sort(
    (a, b) => a.semester - b.semester || a.subjectCode.localeCompare(b.subjectCode),
  )
}

/**
 * Find a specific lesson by slug within a subject's notes.
 */
export function findLessonBySlug(
  subjectCode: string,
  lessonSlug: string,
): { lesson: Lesson; unit: Unit; subject: SubjectNotes } | null {
  const subject = getSubjectNotes(subjectCode)
  if (!subject) return null
  for (const unit of subject.units) {
    for (const lesson of unit.lessons) {
      if (lesson.slug === lessonSlug) {
        return { lesson, unit, subject }
      }
    }
  }
  return null
}

/**
 * Get the previous and next lessons for navigation.
 */
export function getAdjacentLessons(
  subjectCode: string,
  lessonSlug: string,
): { prev: Lesson | null; next: Lesson | null } {
  const subject = getSubjectNotes(subjectCode)
  if (!subject) return { prev: null, next: null }
  const all: Lesson[] = []
  for (const unit of subject.units) {
    all.push(...unit.lessons)
  }
  const idx = all.findIndex((l) => l.slug === lessonSlug)
  if (idx === -1) return { prev: null, next: null }
  return {
    prev: idx > 0 ? all[idx - 1] : null,
    next: idx < all.length - 1 ? all[idx + 1] : null,
  }
}

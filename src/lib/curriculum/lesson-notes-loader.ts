/**
 * Loads lesson notes from JSON files in content/lesson-notes/.
 * Returns structured notes with units, lessons, and quiz questions.
 */
import 'server-only'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const NOTES_DIR = join(process.cwd(), 'content', 'lesson-notes')

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

/**
 * A marked question with marks + optional model answer + tips.
 * Used by interview / viva / PYQ banks at both the lesson and subject level.
 */
export interface MarkedQuestion {
  marks: number
  question: string
  modelAnswer?: string
  tips?: string[]
}

/**
 * A mnemonic phrase that helps students remember a list of items.
 * Used by the `mnemonics` field on `Lesson`.
 */
export interface Mnemonic {
  phrase: string
  expansion: string
  meaning: string
}

/**
 * A single flashcard (front / back / optional hint).
 * Used by the `flashcards` field on `Lesson` and subject-level banks.
 */
export interface Flashcard {
  front: string
  back: string
  hint?: string
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
  vivaQuestions?: MarkedQuestion[]
  interviewQuestions?: MarkedQuestion[]
  examQuestions?: MarkedQuestion[]
  revisionSummary?: string
  cheatSheet?: string[]
  mnemonics?: Mnemonic[]
  callouts?: Array<{ type: string; title?: string; content: string }>
  flashcards?: Flashcard[]
  aiSummaries?: Array<{ style: string; content: string }>
  recommendedNextLessons?: string[]
  // V4 learning path + interactive + assessment fields (optional — may not
  // exist on every JSON file yet; populated by the enhance-lesson-notes script
  // or by future content authoring). All fields are optional so that loaders
  // can safely read older JSON files without crashing.
  learningPath?: {
    estimatedTime: number // minutes
    difficulty: 'easy' | 'medium' | 'hard'
    prerequisites: string[]
    learningObjectives: string[]
    relatedConcepts: string[]
    nextLessonRecommendation?: string
  }
  interactiveElements?: {
    hasCodePlayground?: boolean
    hasFormulaCalculator?: boolean
    hasInteractiveDiagram?: boolean
    hasStepByStepAnimation?: boolean
  }
  assessments?: {
    knowledgeChecks?: Array<{ question: string; answer: string; section: string }>
    miniQuiz?: Array<{
      question: string
      options: string[]
      answer: number
      explanation: string
    }>
    finalAssessment?: Array<{
      question: string
      type: 'mcq' | 'short' | 'long'
      answer: string
      marks: number
    }>
  }
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
  // V3 optional subject-level banks (may not exist in all JSON files)
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
 * Get lesson notes for a subject by its code.
 * Tries the exact code, then the alternate code.
 */
export function getSubjectNotes(subjectCode: string): SubjectNotes | null {
  const notes = loadAllNotes()
  return notes.get(subjectCode) ?? null
}

/**
 * Get all subjects that have lesson notes available.
 */
export function getAvailableNotesSubjects(): { code: string; name: string }[] {
  const notes = loadAllNotes()
  return Array.from(notes.values()).map((n) => ({ code: n.subjectCode, name: n.subjectName }))
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

  // First pass: exact match only (fixes the bug where substring matching
  // caused the first lesson to match when its slug was a substring of the
  // requested slug, e.g. "introduction" matching "introduction-to-os")
  for (const unit of subject.units) {
    for (const lesson of unit.lessons) {
      if (lesson.slug === lessonSlug) {
        return { lesson, unit, subject }
      }
    }
  }

  // Second pass: case-insensitive exact match (handles URL case variations)
  const lowerSlug = lessonSlug.toLowerCase()
  for (const unit of subject.units) {
    for (const lesson of unit.lessons) {
      if (lesson.slug.toLowerCase() === lowerSlug) {
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
  const idx = all.findIndex(
    (l) =>
      l.slug === lessonSlug ||
      l.slug.includes(lessonSlug) ||
      lessonSlug.includes(l.slug),
  )
  if (idx === -1) return { prev: null, next: null }
  return {
    prev: idx > 0 ? all[idx - 1] : null,
    next: idx < all.length - 1 ? all[idx + 1] : null,
  }
}

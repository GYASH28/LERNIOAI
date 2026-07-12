/**
 * V3 Interactive Notes System — Lesson notes loader.
 *
 * Loads lesson notes from JSON files in content/lesson-notes/.
 * Supports the new V3 schema (overview, objectives, prerequisites,
 * detailed theory, analogies, flowcharts, mind maps, tables, diagrams,
 * code examples, complexity, worked examples, common mistakes, viva &
 * interview questions, 2/5/10/15-mark questions, revision summary,
 * cheat sheet, mnemonics, practice quiz, flashcards, AI summaries)
 * while remaining backward-compatible with the V1/V2 flat schema.
 */
import 'server-only'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const NOTES_DIR = join(process.cwd(), 'content', 'lesson-notes')

let cache: Map<string, SubjectNotes> | null = null

// ─────────────────────────────────────────────────────────────────────────────
// V3 schema — all sections are optional so partial JSON still renders.
// ─────────────────────────────────────────────────────────────────────────────

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

/** Mermaid or ASCII diagram. `type` = 'mermaid' | 'ascii' | 'text'. */
export interface Diagram {
  type: string
  title: string
  content: string
}

export interface MarkedQuestion {
  /** "2" | "5" | "10" | "15" — marks. */
  marks: number
  question: string
  /** Suggested answer outline (bullet points or prose). */
  modelAnswer?: string
  /** Tips for maximising marks on this question. */
  tips?: string[]
}

export interface WorkedExample {
  title: string
  problem: string
  solution: string
  explanation?: string
}

export interface Flashcard {
  front: string
  back: string
  /** Optional hint shown after a delay. */
  hint?: string
}

export interface Mnemonic {
  phrase: string
  expansion: string
  meaning: string
}

export interface Callout {
  /** 'info' | 'warning' | 'tip' | 'example' | 'definition' | 'concept' | 'exam-tip' */
  type: string
  title?: string
  content: string
}

export interface ComplexityAnalysis {
  time: string
  space: string
  explanation?: string
}

export interface RealLifeAnalogy {
  scenario: string
  mapping: string
}

export interface AISummary {
  /** 'eli5' | 'eli10' | 'hinglish' | 'marathi' | 'short' | 'detailed' */
  style: string
  content: string
}

export interface Lesson {
  slug: string
  title: string
  durationMin: number
  difficulty: string

  // V3 sections (all optional)
  overview: string
  objectives?: string[]
  prerequisites?: string[]
  /** Detailed theory as markdown (supports GFM, code fences, callouts via HTML). */
  theory?: string
  keyConcepts?: string[]
  analogies?: RealLifeAnalogy[]
  flowcharts?: Diagram[]
  mindMaps?: Diagram[]
  tables?: DataTable[]
  diagrams?: Diagram[]
  codeExamples?: CodeExample[]
  complexity?: ComplexityAnalysis
  workedExamples?: WorkedExample[]
  commonMistakes?: string[]
  vivaQuestions?: MarkedQuestion[]
  interviewQuestions?: MarkedQuestion[]
  examQuestions?: MarkedQuestion[]
  revisionSummary?: string
  cheatSheet?: string[]
  mnemonics?: Mnemonic[]
  formulas?: string[]
  callouts?: Callout[]
  /** @deprecated use callouts[type='exam-tip'] — kept for backward compat with V1/V2 JSON. */
  examTips?: string[]

  // Interactive elements
  practiceQuestions?: PracticeQuestion[]
  flashcards?: Flashcard[]
  aiSummaries?: AISummary[]

  // Navigation
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
  /** Optional subject-level revision notes / formula sheet. */
  revisionNotes?: string
  /** Optional subject-level interview questions bank. */
  interviewBank?: MarkedQuestion[]
  /** Optional subject-level viva questions bank. */
  vivaBank?: MarkedQuestion[]
  /** Optional previous-year questions list. */
  pyqBank?: MarkedQuestion[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Loader
// ─────────────────────────────────────────────────────────────────────────────

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

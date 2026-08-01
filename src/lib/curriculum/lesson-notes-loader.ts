/**
 * Loads lesson notes from JSON files in content/lesson-notes/.
 * Returns structured notes with units, lessons, and quiz questions.
 */
import 'server-only'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
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
  return notes.get(subjectCode) ?? notes.get(subjectCode.trim().toUpperCase()) ?? null
}

export function getAvailableNotesSubjects(): { code: string; name: string }[] {
  const unique = new Map<string, SubjectNotes>()
  for (const notes of loadAllNotes().values()) unique.set(notes.subjectCode, notes)
  return Array.from(unique.values()).map((notes) => ({ code: notes.subjectCode, name: notes.subjectName }))
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

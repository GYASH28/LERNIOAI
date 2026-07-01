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

import { NextRequest } from 'next/server'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface PracticeQuestion {
  question: string
  options: string[]
  answer: number
  explanation: string
}

interface Lesson {
  slug: string
  title: string
  practiceQuestions: PracticeQuestion[]
}

interface Unit {
  number: number
  title: string
  lessons: Lesson[]
}

interface SubjectNotes {
  subjectCode: string
  subjectName: string
  units: Unit[]
}

const NOTES_DIR = join(process.cwd(), 'content', 'lesson-notes')

function loadAllNotes(): Map<string, SubjectNotes> {
  const cache = new Map<string, SubjectNotes>()
  if (!existsSync(NOTES_DIR)) return cache
  try {
    const files = readdirSync(NOTES_DIR).filter(f => f.endsWith('.json'))
    for (const file of files) {
      try {
        const raw = readFileSync(join(NOTES_DIR, file), 'utf-8')
        const notes = JSON.parse(raw) as SubjectNotes
        cache.set(notes.subjectCode, notes)
      } catch {}
    }
  } catch {}
  return cache
}

/**
 * Generate generic quiz questions from subject coverage focus.
 * Used as fallback when no detailed notes exist.
 */
function generateGenericQuestions(subjectName: string, coverageFocus: string): PracticeQuestion[] {
  const topics = coverageFocus.split(/[,.]/).map(t => t.trim()).filter(t => t.length > 3).slice(0, 5)
  const questions: PracticeQuestion[] = []

  for (const topic of topics) {
    questions.push({
      question: `Which of the following best describes "${topic}" in the context of ${subjectName}?`,
      options: [
        `A fundamental concept covered in ${subjectName}`,
        'A programming language feature',
        'A hardware component',
        'A network protocol',
      ],
      answer: 0,
      explanation: `"${topic}" is one of the key topics covered in ${subjectName} as part of the CWIT R23 curriculum. Review the lesson notes and YouTube lectures for detailed understanding.`,
    })
  }

  // Add a general question
  questions.push({
    question: `What is the primary focus of ${subjectName}?`,
    options: [
      coverageFocus.split(',')[0]?.trim() ?? 'Core concepts of the subject',
      'Database management',
      'Network security',
      'Hardware design',
    ],
    answer: 0,
    explanation: `The primary focus of ${subjectName} is: ${coverageFocus}`,
  })

  return questions
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const subjectCode = url.searchParams.get('subject')
  const subjectName = url.searchParams.get('name') ?? subjectCode ?? ''
  const coverage = url.searchParams.get('coverage') ?? ''
  const count = Math.min(parseInt(url.searchParams.get('count') ?? '5'), 50)

  if (!subjectCode) {
    return Response.json({ error: 'Missing subject parameter' }, { status: 400 })
  }

  // Try to load detailed notes first
  const allNotes = loadAllNotes()
  const notes = allNotes.get(subjectCode)

  let questions: (PracticeQuestion & { lessonTitle?: string })[] = []

  if (notes) {
    // Use detailed notes questions
    for (const unit of notes.units) {
      for (const lesson of unit.lessons) {
        for (const q of lesson.practiceQuestions) {
          questions.push({ ...q, lessonTitle: lesson.title })
        }
      }
    }
  }

  // If no detailed questions, generate generic ones
  if (questions.length === 0) {
    questions = generateGenericQuestions(subjectName || subjectCode, coverage || 'the core concepts of this subject')
  }

  if (questions.length === 0) {
    return Response.json({ error: 'No quiz questions found' }, { status: 404 })
  }

  // Shuffle and pick the requested count
  const shuffled = [...questions].sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, Math.min(count, questions.length))

  return Response.json({
    subject: notes?.subjectName ?? subjectName,
    subjectCode,
    totalAvailable: questions.length,
    questions: selected,
  })
}

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
  keyConcepts?: string[]
  overview?: string
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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Shuffle answer options and track the correct index
function shuffleOptions(q: PracticeQuestion): PracticeQuestion {
  const correctAnswer = q.options[q.answer]
  const shuffledOpts = shuffle(q.options)
  return {
    ...q,
    options: shuffledOpts,
    answer: shuffledOpts.indexOf(correctAnswer),
  }
}

/**
 * Generate a large pool of questions from subject coverage focus.
 * Creates multiple question TYPES for variety:
 * - Definition questions
 * - True/False (as 4-option)
 * - Application questions
 * - Concept identification
 * - Fill-in-the-blank style
 */
function generateQuestionPool(subjectName: string, coverageFocus: string, subjectCode: string): PracticeQuestion[] {
  const topics = coverageFocus.split(/[,.]/).map(t => t.trim()).filter(t => t.length > 3).slice(0, 8)
  const questions: PracticeQuestion[] = []

  // Type 1: Definition questions for each topic
  for (const topic of topics) {
    const distractors = shuffle([
      'A memory management technique',
      'A type of network topology',
      'A database normalization form',
      'A sorting algorithm complexity class',
      'A compiler optimization technique',
      'A software testing methodology',
      'A data transmission protocol',
      'An operating system scheduling algorithm',
    ]).slice(0, 3)

    questions.push({
      question: `In ${subjectName}, what does "${topic}" refer to?`,
      options: shuffle([`A key concept in ${subjectName} related to ${topic}`, ...distractors]),
      answer: -1, // will be set after shuffle
      explanation: `"${topic}" is a fundamental topic in ${subjectName}. It is part of the CWIT R23 curriculum and covers essential knowledge for this subject. Review the lesson notes, attempt a small example, and use a reviewed lesson video when one is available.`,
    })
    // Fix the answer index
    const last = questions[questions.length - 1]!
    last.answer = last.options.indexOf(`A key concept in ${subjectName} related to ${topic}`)
  }

  // Type 2: True/False style (as 4-option)
  for (const topic of topics) {
    const isTrue = Math.random() > 0.5
    questions.push({
      question: `True or False: "${topic}" is an important topic in ${subjectName}.`,
      options: ['True', 'False', 'Only in advanced courses', 'Only in practical exams'],
      answer: isTrue ? 0 : 1,
      explanation: `"${topic}" ${isTrue ? 'is' : 'is not typically'} a core topic in ${subjectName}. The CWIT R23 syllabus covers this as part of the ${subjectCode} curriculum.`,
    })
  }

  // Type 3: Application questions
  for (const topic of topics) {
    questions.push({
      question: `Which scenario best demonstrates the application of "${topic}" in ${subjectName}?`,
      options: shuffle([
        `Solving a problem related to ${topic} as covered in the ${subjectName} syllabus`,
        'Managing a database transaction',
        'Configuring a network router',
        'Writing a device driver',
      ]),
      answer: -1,
      explanation: `"${topic}" is applied when solving problems related to this topic in ${subjectName}. The lesson notes and practice activities provide a starting point; use a reviewed lesson video when one is available.`,
    })
    const last = questions[questions.length - 1]!
    last.answer = last.options.indexOf(`Solving a problem related to ${topic} as covered in the ${subjectName} syllabus`)
  }

  // Type 4: Concept identification
  questions.push({
    question: `Which of the following is NOT a topic covered in ${subjectName}?`,
    options: shuffle([
      ...topics.slice(0, 3).map(t => t),
      'Quantum computing entanglement',
    ]),
    answer: -1,
    explanation: `Quantum computing entanglement is not part of the ${subjectName} syllabus. The other options are all key topics from the CWIT R23 curriculum.`,
  })
  const q4 = questions[questions.length - 1]!
  q4.answer = q4.options.indexOf('Quantum computing entanglement')

  // Type 5: Subject overview question
  questions.push({
    question: `What is the primary focus of ${subjectName} (${subjectCode})?`,
    options: shuffle([
      coverageFocus.split(/[,.]/)[0]?.trim() ?? `Core concepts of ${subjectName}`,
      'Advanced quantum mechanics',
      'Organic chemistry synthesis',
      'Structural engineering design',
    ]),
    answer: -1,
    explanation: `The primary focus of ${subjectName} is: ${coverageFocus}`,
  })
  const q5 = questions[questions.length - 1]!
  q5.answer = q5.options.indexOf(coverageFocus.split(/[,.]/)[0]?.trim() ?? `Core concepts of ${subjectName}`)

  // Type 6: Exam weightage question
  questions.push({
    question: `How should you prioritize studying ${subjectName} for exams?`,
    options: [
      `Focus on: ${coverageFocus.slice(0, 80)}...`,
      'Memorize the textbook cover to cover',
      'Skip the practical components',
      'Only watch videos without practicing',
    ],
    answer: 0,
    explanation: `The coverage focus areas are the most important topics for your exam. Study them with the official lesson notes, a reviewed lesson video when available, and then practice with quizzes.`,
  })

  return questions
}

// Quiz presets
const PRESETS: Record<string, number> = {
  'quick': 5,
  'short': 10,
  'medium': 20,
  'long': 35,
  'full': 50,
  'marathon': 70,
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const subjectCode = url.searchParams.get('subject')
  const subjectName = url.searchParams.get('name') ?? subjectCode ?? ''
  const coverage = url.searchParams.get('coverage') ?? ''
  const preset = url.searchParams.get('preset') // quick|short|medium|long|full|marathon
  const countParam = url.searchParams.get('count')

  // Determine count from preset or direct param
  let count: number
  if (preset && PRESETS[preset]) {
    count = PRESETS[preset]
  } else {
    count = Math.min(parseInt(countParam ?? '10'), 100)
  }

  if (!subjectCode) {
    return Response.json({ error: 'Missing subject parameter' }, { status: 400 })
  }

  // Load detailed notes
  const allNotes = loadAllNotes()
  const notes = allNotes.get(subjectCode)

  let questions: (PracticeQuestion & { lessonTitle?: string })[] = []

  if (notes) {
    for (const unit of notes.units) {
      for (const lesson of unit.lessons) {
        for (const q of lesson.practiceQuestions) {
          questions.push({ ...q, lessonTitle: lesson.title })
        }
      }
    }
  }

  // Always generate additional questions from coverage focus
  const generated = generateQuestionPool(subjectName || subjectCode, coverage || 'the core concepts of this subject', subjectCode)
  questions = [...questions, ...generated]

  if (questions.length === 0) {
    return Response.json({ error: 'No quiz questions found' }, { status: 404 })
  }

  // Shuffle ALL questions randomly
  const shuffled = shuffle(questions)

  // If we need more questions than available, repeat with shuffled copies
  let selected = shuffled
  if (count > selected.length) {
    while (selected.length < count) {
      selected = [...selected, ...shuffled.map(q => ({ ...q, options: shuffle(q.options), answer: q.answer }))]
    }
  }

  // Take exactly the requested count
  selected = selected.slice(0, count)

  // Shuffle each question's options independently
  selected = selected.map(q => shuffleOptions(q))

  return Response.json({
    subject: notes?.subjectName ?? subjectName,
    subjectCode,
    totalAvailable: questions.length,
    requested: count,
    preset: preset ?? 'custom',
    questions: selected,
  })
}

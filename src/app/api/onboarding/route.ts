import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { saveAcademicProfile } from '@/lib/academics/profile-store'
import {
  BOARDS,
  CLASS_LEVELS,
  STREAMS,
  TARGET_EXAMS,
  defaultSubjectsForStream,
  type Board,
  type ClassLevel,
  type Stream,
  type SubjectSlug,
  type TargetExam,
} from '@/lib/academics/types'

const allowedStudyGoals = new Set([30, 60, 120, 180, 240])
const supportedStreams = new Set<Stream>(['PCM', 'PCB', 'PCMB'])

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const board = body.board as Board
  const classLevel = body.classLevel as ClassLevel
  const stream = body.stream as Stream
  const targetExams = stringArray(body.targetExams) as TargetExam[]
  const targetYear = Number(body.targetYear)
  const dailyStudyGoal = Number(body.dailyStudyGoal)
  const weakSubjects = stringArray(body.weakSubjects) as SubjectSlug[]
  const preferredLearningStyle = typeof body.preferredLearningStyle === 'string'
    ? body.preferredLearningStyle
    : null

  if (!BOARDS.includes(board) || !CLASS_LEVELS.includes(classLevel) || !STREAMS.includes(stream)) {
    return NextResponse.json({ error: 'Choose a valid board, class and stream.' }, { status: 400 })
  }

  if (!supportedStreams.has(stream)) {
    return NextResponse.json(
      { error: 'Lernio currently supports the PCM, PCB and PCMB science streams.' },
      { status: 400 },
    )
  }

  if (!targetExams.length || targetExams.some((exam) => !TARGET_EXAMS.includes(exam))) {
    return NextResponse.json({ error: 'Choose at least one valid preparation goal.' }, { status: 400 })
  }

  const isPcm = stream === 'PCM' || stream === 'PCMB'
  if (!isPcm && targetExams.some((exam) => exam === 'JEE_MAIN' || exam === 'JEE_ADVANCED')) {
    return NextResponse.json({ error: 'JEE preparation is available for PCM/PCMB profiles.' }, { status: 400 })
  }

  const currentYear = new Date().getFullYear()
  if (!Number.isInteger(targetYear) || targetYear < currentYear || targetYear > currentYear + 6) {
    return NextResponse.json({ error: 'Choose a valid target exam year.' }, { status: 400 })
  }

  if (!allowedStudyGoals.has(dailyStudyGoal)) {
    return NextResponse.json({ error: 'Choose a valid daily study target.' }, { status: 400 })
  }

  const subjects = defaultSubjectsForStream(stream)
  const validWeakSubjects = weakSubjects.filter((subject) => subjects.includes(subject))

  try {
    const profile = await saveAcademicProfile(user.id, {
      board,
      classLevel,
      stream,
      targetExams,
      targetYear,
      subjects,
      dailyStudyGoal,
      preferredLearningStyle,
      weakSubjects: validWeakSubjects,
      strongSubjects: [],
    })

    await db.user.update({
      where: { id: user.id },
      data: { dailyMins: dailyStudyGoal, profileComplete: true, onboarded: true },
    }).catch(() => null)

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Academic onboarding failed', error)
    return NextResponse.json(
      { error: 'We could not save your Lernio workspace. Please try again.' },
      { status: 500 },
    )
  }
}

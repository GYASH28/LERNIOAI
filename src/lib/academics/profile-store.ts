import { randomUUID } from 'crypto'
import { db } from '@/lib/db'
import type { Board, ClassLevel, Stream, StudentAcademicProfile, SubjectSlug, TargetExam } from './types'

interface AcademicProfileRow {
  id: string
  userId: string
  board: string
  classLevel: string
  stream: string
  targetExams: unknown
  targetYear: number
  subjects: unknown
  dailyStudyGoal: number
  preferredLearningStyle: string | null
  strongSubjects: unknown
  weakSubjects: unknown
  createdAt: Date
  updatedAt: Date
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function toProfile(row: AcademicProfileRow): StudentAcademicProfile {
  return {
    ...row,
    board: row.board as Board,
    classLevel: row.classLevel as ClassLevel,
    stream: row.stream as Stream,
    targetExams: stringArray(row.targetExams) as TargetExam[],
    subjects: stringArray(row.subjects) as SubjectSlug[],
    strongSubjects: stringArray(row.strongSubjects) as SubjectSlug[],
    weakSubjects: stringArray(row.weakSubjects) as SubjectSlug[],
  }
}

export async function getAcademicProfile(userId: string): Promise<StudentAcademicProfile | null> {
  try {
    const rows = await db.$queryRaw<AcademicProfileRow[]>`
      SELECT * FROM "StudentAcademicProfile"
      WHERE "userId" = ${userId}
      LIMIT 1
    `
    return rows[0] ? toProfile(rows[0]) : null
  } catch {
    // During rollout the migration may not have run yet. Treat that state as
    // incomplete onboarding rather than silently falling back to diploma data.
    return null
  }
}

export interface SaveAcademicProfileInput {
  board: Board
  classLevel: ClassLevel
  stream: Stream
  targetExams: TargetExam[]
  targetYear: number
  subjects: SubjectSlug[]
  dailyStudyGoal: number
  preferredLearningStyle?: string | null
  strongSubjects?: SubjectSlug[]
  weakSubjects?: SubjectSlug[]
}

export async function saveAcademicProfile(userId: string, input: SaveAcademicProfileInput) {
  const id = randomUUID()
  const targetExams = JSON.stringify(input.targetExams)
  const subjects = JSON.stringify(input.subjects)
  const strongSubjects = JSON.stringify(input.strongSubjects ?? [])
  const weakSubjects = JSON.stringify(input.weakSubjects ?? [])

  await db.$executeRaw`
    INSERT INTO "StudentAcademicProfile" (
      "id", "userId", "board", "classLevel", "stream", "targetExams",
      "targetYear", "subjects", "dailyStudyGoal", "preferredLearningStyle",
      "strongSubjects", "weakSubjects", "createdAt", "updatedAt"
    ) VALUES (
      ${id}, ${userId}, ${input.board}, ${input.classLevel}, ${input.stream},
      ${targetExams}::jsonb, ${input.targetYear}, ${subjects}::jsonb,
      ${input.dailyStudyGoal}, ${input.preferredLearningStyle ?? null},
      ${strongSubjects}::jsonb, ${weakSubjects}::jsonb, NOW(), NOW()
    )
    ON CONFLICT ("userId") DO UPDATE SET
      "board" = EXCLUDED."board",
      "classLevel" = EXCLUDED."classLevel",
      "stream" = EXCLUDED."stream",
      "targetExams" = EXCLUDED."targetExams",
      "targetYear" = EXCLUDED."targetYear",
      "subjects" = EXCLUDED."subjects",
      "dailyStudyGoal" = EXCLUDED."dailyStudyGoal",
      "preferredLearningStyle" = EXCLUDED."preferredLearningStyle",
      "strongSubjects" = EXCLUDED."strongSubjects",
      "weakSubjects" = EXCLUDED."weakSubjects",
      "updatedAt" = NOW()
  `

  return getAcademicProfile(userId)
}

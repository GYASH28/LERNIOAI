import { db } from '@/lib/db'

export interface AcademicOverview {
  questionsAttempted: number
  correctAnswers: number
  accuracy: number | null
  averageTimeSeconds: number | null
  mistakesOpen: number
  revisionDue: number
}

export interface MasteryRow {
  classLevel: '11' | '12'
  subjectSlug: string
  chapterSlug: string
  topicSlug: string | null
  attempts: number
  accuracy: number | null
  masteryScore: number | null
  averageTimeSeconds: number | null
  lastPractisedAt: Date | null
}

interface OverviewRow {
  questionsAttempted: bigint | number
  correctAnswers: bigint | number
  averageTimeSeconds: number | null
}

interface CountRow { count: bigint | number }

function number(value: bigint | number | null | undefined) {
  if (typeof value === 'bigint') return Number(value)
  return value ?? 0
}

export async function getAcademicOverview(userId: string): Promise<AcademicOverview> {
  try {
    const [attemptRows, mistakeRows, revisionRows] = await Promise.all([
      db.$queryRaw<OverviewRow[]>`
        SELECT COUNT(*) AS "questionsAttempted",
               COUNT(*) FILTER (WHERE "isCorrect" = TRUE) AS "correctAnswers",
               AVG("timeTakenSeconds")::DOUBLE PRECISION AS "averageTimeSeconds"
        FROM "AcademicQuestionAttempt"
        WHERE "userId" = ${userId}
      `,
      db.$queryRaw<CountRow[]>`
        SELECT COUNT(*) AS "count" FROM "AcademicMistake"
        WHERE "userId" = ${userId} AND "resolvedAt" IS NULL
      `,
      db.$queryRaw<CountRow[]>`
        SELECT COUNT(*) AS "count" FROM "AcademicRevisionItem"
        WHERE "userId" = ${userId} AND "dueAt" <= NOW()
      `,
    ])

    const attempted = number(attemptRows[0]?.questionsAttempted)
    const correct = number(attemptRows[0]?.correctAnswers)
    return {
      questionsAttempted: attempted,
      correctAnswers: correct,
      accuracy: attempted ? Math.round((correct / attempted) * 1000) / 10 : null,
      averageTimeSeconds: attemptRows[0]?.averageTimeSeconds ?? null,
      mistakesOpen: number(mistakeRows[0]?.count),
      revisionDue: number(revisionRows[0]?.count),
    }
  } catch {
    return { questionsAttempted: 0, correctAnswers: 0, accuracy: null, averageTimeSeconds: null, mistakesOpen: 0, revisionDue: 0 }
  }
}

export async function getMasteryRows(userId: string): Promise<MasteryRow[]> {
  try {
    return await db.$queryRaw<MasteryRow[]>`
      SELECT "classLevel", "subjectSlug", "chapterSlug", NULLIF("topicSlug", '') AS "topicSlug", "attempts",
             "accuracy", "masteryScore", "averageTimeSeconds", "lastPractisedAt"
      FROM "AcademicMasteryRecord"
      WHERE "userId" = ${userId}
      ORDER BY COALESCE("masteryScore", 0) ASC, "attempts" DESC
      LIMIT 50
    `
  } catch {
    return []
  }
}

import { db } from '@/lib/db'

interface CountRow { count: bigint | number }
export interface MistakeRow {
  id: string
  questionId: string
  category: string | null
  occurrenceCount: number
  lastAttemptAt: Date
  nextReviewAt: Date | null
  subjectSlug: string
  chapterSlug: string
  topicSlug: string | null
  prompt: string
  sourceType: string
  sourceLabel: string | null
  sourceYear: number | null
}

const n = (value: bigint | number | undefined) => typeof value === 'bigint' ? Number(value) : value ?? 0

export async function getRevisionSummary(userId: string) {
  try {
    const [due, mistakes, repeated] = await Promise.all([
      db.$queryRaw<CountRow[]>`SELECT COUNT(*) AS "count" FROM "AcademicRevisionItem" WHERE "userId" = ${userId} AND "dueAt" <= NOW()`,
      db.$queryRaw<CountRow[]>`SELECT COUNT(*) AS "count" FROM "AcademicMistake" WHERE "userId" = ${userId} AND "resolvedAt" IS NULL`,
      db.$queryRaw<CountRow[]>`SELECT COUNT(*) AS "count" FROM "AcademicMistake" WHERE "userId" = ${userId} AND "resolvedAt" IS NULL AND "occurrenceCount" > 1`,
    ])
    return { due: n(due[0]?.count), mistakes: n(mistakes[0]?.count), repeatedMistakes: n(repeated[0]?.count) }
  } catch {
    return { due: 0, mistakes: 0, repeatedMistakes: 0 }
  }
}

export async function getMistakes(userId: string, limit = 50): Promise<MistakeRow[]> {
  try {
    return await db.$queryRaw<MistakeRow[]>`
      SELECT m."id", m."questionId", m."category", m."occurrenceCount", m."lastAttemptAt", m."nextReviewAt",
             q."subjectSlug", q."chapterSlug", q."topicSlug", q."prompt", q."sourceType", q."sourceLabel", q."sourceYear"
      FROM "AcademicMistake" m
      JOIN "AcademicQuestion" q ON q."id" = m."questionId"
      WHERE m."userId" = ${userId} AND m."resolvedAt" IS NULL
      ORDER BY m."occurrenceCount" DESC, m."lastAttemptAt" DESC
      LIMIT ${Math.max(1, Math.min(limit, 100))}
    `
  } catch {
    return []
  }
}

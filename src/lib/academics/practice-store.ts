import { randomUUID } from 'crypto'
import { db } from '@/lib/db'

export interface PracticeQuestion {
  id: string
  board: string
  classLevel: string
  subjectSlug: string
  chapterSlug: string
  topicSlug: string | null
  concept: string | null
  difficulty: string
  examType: string
  questionType: string
  prompt: string
  options: unknown
  marks: number
  negativeMarks: number
  estimatedTimeSeconds: number | null
  sourceType: string
  sourceLabel: string | null
  sourceYear: number | null
}

interface AnswerRow {
  id: string
  subjectSlug: string
  chapterSlug: string
  topicSlug: string | null
  correctAnswer: unknown
  solution: string
  explanation: string | null
  hint: string | null
}

export async function getPracticeQuestions(input: {
  classLevel: '11' | '12'
  subjectSlug: string
  chapterSlug?: string
  examType?: string
  sourceType?: 'PYQ' | 'ORIGINAL' | 'AI_GENERATED' | 'IMPORTED'
  limit?: number
}): Promise<PracticeQuestion[]> {
  const limit = Math.max(1, Math.min(input.limit ?? 15, 50))
  const select = `
    SELECT "id", "board", "classLevel", "subjectSlug", "chapterSlug", "topicSlug", "concept",
           "difficulty", "examType", "questionType", "prompt", "options", "marks",
           "negativeMarks"::DOUBLE PRECISION AS "negativeMarks", "estimatedTimeSeconds",
           "sourceType", "sourceLabel", "sourceYear"
    FROM "AcademicQuestion"
  `

  try {
    if (input.chapterSlug && input.examType && input.sourceType) {
      return await db.$queryRawUnsafe<PracticeQuestion[]>(`${select}
        WHERE "isPublished" = TRUE AND "classLevel" = $1 AND "subjectSlug" = $2
          AND "chapterSlug" = $3 AND "examType" = $4 AND "sourceType" = $5
        ORDER BY RANDOM() LIMIT $6`, input.classLevel, input.subjectSlug, input.chapterSlug, input.examType, input.sourceType, limit)
    }
    if (input.examType && input.sourceType) {
      return await db.$queryRawUnsafe<PracticeQuestion[]>(`${select}
        WHERE "isPublished" = TRUE AND "classLevel" = $1 AND "subjectSlug" = $2
          AND "examType" = $3 AND "sourceType" = $4
        ORDER BY RANDOM() LIMIT $5`, input.classLevel, input.subjectSlug, input.examType, input.sourceType, limit)
    }
    if (input.chapterSlug && input.examType) {
      return await db.$queryRawUnsafe<PracticeQuestion[]>(`${select}
        WHERE "isPublished" = TRUE AND "classLevel" = $1 AND "subjectSlug" = $2
          AND "chapterSlug" = $3 AND "examType" = $4
        ORDER BY RANDOM() LIMIT $5`, input.classLevel, input.subjectSlug, input.chapterSlug, input.examType, limit)
    }
    if (input.chapterSlug) {
      return await db.$queryRawUnsafe<PracticeQuestion[]>(`${select}
        WHERE "isPublished" = TRUE AND "classLevel" = $1 AND "subjectSlug" = $2 AND "chapterSlug" = $3
        ORDER BY RANDOM() LIMIT $4`, input.classLevel, input.subjectSlug, input.chapterSlug, limit)
    }
    if (input.examType) {
      return await db.$queryRawUnsafe<PracticeQuestion[]>(`${select}
        WHERE "isPublished" = TRUE AND "classLevel" = $1 AND "subjectSlug" = $2 AND "examType" = $3
        ORDER BY RANDOM() LIMIT $4`, input.classLevel, input.subjectSlug, input.examType, limit)
    }
    return await db.$queryRawUnsafe<PracticeQuestion[]>(`${select}
      WHERE "isPublished" = TRUE AND "classLevel" = $1 AND "subjectSlug" = $2
      ORDER BY RANDOM() LIMIT $3`, input.classLevel, input.subjectSlug, limit)
  } catch {
    return []
  }
}

function normalizeAnswer(value: unknown) {
  if (Array.isArray(value)) return [...value].map(String).sort().join('|').trim().toLowerCase()
  if (value && typeof value === 'object') return JSON.stringify(value)
  return String(value ?? '').trim().toLowerCase()
}

export async function recordPracticeAnswer(input: {
  userId: string
  questionId: string
  selectedAnswer: unknown
  timeTakenSeconds?: number
  practiceMode?: string
}) {
  const rows = await db.$queryRaw<AnswerRow[]>`
    SELECT "id", "subjectSlug", "chapterSlug", "topicSlug", "correctAnswer", "solution", "explanation", "hint"
    FROM "AcademicQuestion"
    WHERE "id" = ${input.questionId} AND "isPublished" = TRUE
    LIMIT 1
  `
  const question = rows[0]
  if (!question) return null

  const isCorrect = normalizeAnswer(input.selectedAnswer) === normalizeAnswer(question.correctAnswer)
  const attemptId = randomUUID()
  const selectedJson = JSON.stringify(input.selectedAnswer ?? null)
  const timeTaken = Number.isFinite(input.timeTakenSeconds) ? Math.max(0, Math.round(input.timeTakenSeconds ?? 0)) : null

  await db.$executeRaw`
    INSERT INTO "AcademicQuestionAttempt" (
      "id", "userId", "questionId", "selectedAnswer", "isCorrect", "timeTakenSeconds", "practiceMode", "createdAt"
    ) VALUES (
      ${attemptId}, ${input.userId}, ${question.id}, ${selectedJson}::jsonb, ${isCorrect}, ${timeTaken}, ${input.practiceMode ?? 'TOPIC'}, NOW()
    )
  `

  if (!isCorrect) {
    await db.$executeRaw`
      INSERT INTO "AcademicMistake" (
        "id", "userId", "questionId", "occurrenceCount", "lastAttemptAt", "nextReviewAt", "createdAt", "updatedAt"
      ) VALUES (
        ${randomUUID()}, ${input.userId}, ${question.id}, 1, NOW(), NOW() + INTERVAL '1 day', NOW(), NOW()
      )
      ON CONFLICT ("userId", "questionId") DO UPDATE SET
        "occurrenceCount" = "AcademicMistake"."occurrenceCount" + 1,
        "lastAttemptAt" = NOW(),
        "nextReviewAt" = NOW() + INTERVAL '1 day',
        "resolvedAt" = NULL,
        "updatedAt" = NOW()
    `
  }

  const masteryId = randomUUID()
  const topicKey = question.topicSlug ?? ''
  await db.$executeRaw`
    INSERT INTO "AcademicMasteryRecord" (
      "id", "userId", "subjectSlug", "chapterSlug", "topicSlug", "attempts", "correctAttempts",
      "accuracy", "masteryScore", "averageTimeSeconds", "lastPractisedAt", "updatedAt"
    ) VALUES (
      ${masteryId}, ${input.userId}, ${question.subjectSlug}, ${question.chapterSlug}, ${topicKey},
      1, ${isCorrect ? 1 : 0}, ${isCorrect ? 100 : 0}, ${isCorrect ? 20 : 5}, ${timeTaken}, NOW(), NOW()
    )
    ON CONFLICT ("userId", "subjectSlug", "chapterSlug", "topicSlug") DO UPDATE SET
      "attempts" = "AcademicMasteryRecord"."attempts" + 1,
      "correctAttempts" = "AcademicMasteryRecord"."correctAttempts" + ${isCorrect ? 1 : 0},
      "accuracy" = (("AcademicMasteryRecord"."correctAttempts" + ${isCorrect ? 1 : 0})::DOUBLE PRECISION /
                    ("AcademicMasteryRecord"."attempts" + 1)::DOUBLE PRECISION) * 100,
      "masteryScore" = LEAST(100, GREATEST(0,
        COALESCE("AcademicMasteryRecord"."masteryScore", 0) + ${isCorrect ? 6 : -4}
      )),
      "averageTimeSeconds" = CASE
        WHEN ${timeTaken} IS NULL THEN "AcademicMasteryRecord"."averageTimeSeconds"
        WHEN "AcademicMasteryRecord"."averageTimeSeconds" IS NULL THEN ${timeTaken}
        ELSE (("AcademicMasteryRecord"."averageTimeSeconds" * "AcademicMasteryRecord"."attempts") + ${timeTaken}) /
             ("AcademicMasteryRecord"."attempts" + 1)
      END,
      "lastPractisedAt" = NOW(),
      "updatedAt" = NOW()
  `

  return {
    isCorrect,
    correctAnswer: question.correctAnswer,
    solution: question.solution,
    explanation: question.explanation,
    hint: question.hint,
  }
}

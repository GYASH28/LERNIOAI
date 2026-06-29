import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, withApi, okResponse, ApiError } from '@/lib/auth'
import { parseBody, codingRunSchema, codingSubmitSchema } from '@/lib/schemas'
import {
  getStudentLearningScope,
  hasResolvedLearningScope,
  lessonIdsForLearningScope,
  subjectIdsForLearningScope,
  topicIdsForLearningScope,
  unitIdsForLearningScope,
} from '@/features/learning/server/get-student-learning-scope'
import {
  codingChallengeContextFromRecord,
  codingChallengeWhereForLearningScope,
} from '@/lib/coding/coding-scope'

/**
 * GET /api/coding
 * Returns the catalogue of CodingChallenge rows. Solution code + test cases
 * are stripped so the browser can't peek at expected outputs.
 */
export async function GET() {
  return withApi(async () => {
    const user = await requireUser()
    const learningScope = await getStudentLearningScope(user.id)
    if (!hasResolvedLearningScope(learningScope)) return okResponse([])

    const challenges = await db.codingChallenge.findMany({
      where: codingChallengeWhereForLearningScope({
        subjectIds: subjectIdsForLearningScope(learningScope),
        unitIds: unitIdsForLearningScope(learningScope),
        topicIds: topicIdsForLearningScope(learningScope),
        lessonIds: lessonIdsForLearningScope(learningScope),
        canPreviewDrafts: learningScope.canPreviewDrafts,
      }),
      orderBy: [{ category: 'asc' }, { difficulty: 'asc' }],
      select: {
        id: true,
        title: true,
        category: true,
        difficulty: true,
        description: true,
        starterCode: true,
        timeLimitMs: true,
        memoryLimitKB: true,
        status: true,
        subjectId: true,
        unitId: true,
        topicId: true,
        lessonId: true,
        sourceEvidence: true,
        createdAt: true,
        subject: { select: { id: true, code: true, name: true } },
        unit: {
          select: {
            id: true,
            number: true,
            title: true,
            subjectId: true,
            subject: { select: { id: true, code: true, name: true } },
          },
        },
        topic: {
          select: {
            id: true,
            slug: true,
            title: true,
            unitId: true,
            unit: {
              select: {
                id: true,
                number: true,
                title: true,
                subjectId: true,
                subject: { select: { id: true, code: true, name: true } },
              },
            },
          },
        },
        lesson: {
          select: {
            id: true,
            title: true,
            unitId: true,
            topicId: true,
            unit: {
              select: {
                id: true,
                number: true,
                title: true,
                subjectId: true,
                subject: { select: { id: true, code: true, name: true } },
              },
            },
            topic: {
              select: {
                id: true,
                slug: true,
                title: true,
                unitId: true,
                unit: {
                  select: {
                    id: true,
                    number: true,
                    title: true,
                    subjectId: true,
                    subject: { select: { id: true, code: true, name: true } },
                  },
                },
              },
            },
          },
        },
      },
    })
    return okResponse(challenges.map(toCodingChallengeDto))
  })
}

/**
 * HONEST CODE-LAB POLICY (audit finding 8 — coding honesty):
 *
 * The sandbox has no isolated C++ runner. We therefore:
 *   - "Run"  = LOCAL SYNTAX PREVIEW only. We do a light static check (matching
 *              braces, presence of `int main(`) and return that feedback.
 *              We do NOT execute, do NOT compare against test cases, do NOT
 *              award XP, and do NOT record a "passed" submission.
 *   - "Submit" = disabled in this build. We record the code as a draft
 *                 submission and return a clear message that real execution
 *                 requires the production runner.
 *
 * Wrong programs can NEVER "pass" because we never claim they pass.
 */
export async function POST(req: NextRequest) {
  return withApi(async () => {
    const user = await requireUser()

    // Detect intent: a `challengeId` field indicates a Submit attempt;
    // its absence (or null) indicates a Run / syntax preview.
    // Clone FIRST so we can read the body twice (peek for challengeId, then parse).
    const cloned = req.clone()
    let rawBody: unknown
    try {
      rawBody = await req.json()
    } catch {
      throw new ApiError('BAD_REQUEST', 'Invalid request body.', 400, false)
    }

    const isSubmitAttempt =
      typeof rawBody === 'object' &&
      rawBody !== null &&
      'challengeId' in rawBody &&
      typeof (rawBody as Record<string, unknown>).challengeId === 'string' &&
      (rawBody as Record<string, unknown>).challengeId !== ''

    if (isSubmitAttempt) {
      const body = await parseBody(cloned, codingSubmitSchema)
      const learningScope = await getStudentLearningScope(user.id)
      if (!hasResolvedLearningScope(learningScope)) {
        throw new ApiError('NOT_FOUND', 'Coding challenge not found.', 404, false)
      }

      const challenge = await db.codingChallenge.findFirst({
        where: {
          id: body.challengeId,
          ...codingChallengeWhereForLearningScope({
            subjectIds: subjectIdsForLearningScope(learningScope),
            unitIds: unitIdsForLearningScope(learningScope),
            topicIds: topicIdsForLearningScope(learningScope),
            lessonIds: lessonIdsForLearningScope(learningScope),
            canPreviewDrafts: learningScope.canPreviewDrafts,
          }),
        },
        select: codingChallengeContextSelect,
      })
      if (!challenge) {
        throw new ApiError('NOT_FOUND', 'Coding challenge not found.', 404, false)
      }
      const context = codingChallengeContextFromRecord(challenge)

      // Persist as a draft — never mark as passed/failed since we cannot run it.
      const submission = await db.codingSubmission.create({
        data: {
          userId: user.id,
          challengeId: body.challengeId,
          subjectId: context.subjectId,
          unitId: context.unitId,
          topicId: context.topicId,
          lessonId: context.lessonId,
          code: body.code,
          language: body.language,
          status: 'submitted',
          output: null,
          compileError: null,
          testResults: null,
        },
      })

      return okResponse({
        submission,
        status: 'not_executed',
        message:
          'Code submitted as a draft. Real test execution requires the production code runner, which is not available in this environment. Your code has been saved — a teacher can review it manually.',
        // Be explicit so the client cannot mistake this for a pass.
        passed: false,
        xpGain: 0,
      })
    }

    // Otherwise: Run = local syntax preview only.
    const body = await parseBody(cloned, codingRunSchema)

    const code = body.code
    const openBraces = (code.match(/{/g) || []).length
    const closeBraces = (code.match(/}/g) || []).length
    const hasMain = /int\s+main\s*\(/.test(code)
    const hasReturn = /return\s+0\s*;/.test(code)

    const issues: string[] = []
    if (!hasMain) issues.push("Missing 'int main()' function.")
    if (openBraces !== closeBraces)
      issues.push(`Unbalanced braces: ${openBraces} '{' vs ${closeBraces} '}'.`)
    if (!hasReturn)
      issues.push("Missing 'return 0;' — recommended at the end of main().")

    // Record as a draft preview — never as a passed/failed execution.
    const submission = await db.codingSubmission.create({
      data: {
        userId: user.id,
        challengeId: null,
        code: body.code,
        language: body.language,
        status: 'draft',
        output: null,
        compileError: issues.length ? issues.join('\n') : null,
        testResults: null,
      },
    })

    return okResponse({
      submission,
      status: 'syntax_preview',
      passed: false,
      xpGain: 0,
      syntax: {
        ok: issues.length === 0,
        issues,
      },
      message:
        issues.length === 0
          ? 'Local syntax preview: no obvious structural issues detected. This is NOT a compile or test run — code execution requires the production runner.'
          : `Local syntax preview found ${issues.length} issue(s):\n${issues.map((i) => '• ' + i).join('\n')}`,
    })
  })
}

interface CodingSubjectMeta {
  id: string
  code: string
  name: string
}

interface CodingUnitMeta {
  id: string
  number: number
  title: string
  subjectId: string
  subject: CodingSubjectMeta
}

interface CodingTopicMeta {
  id: string
  slug: string
  title: string
  unitId: string
  unit: CodingUnitMeta
}

interface CodingLessonMeta {
  id: string
  title: string
  unitId: string | null
  topicId: string | null
  unit: CodingUnitMeta | null
  topic: CodingTopicMeta | null
}

interface CodingChallengeListRow {
  id: string
  title: string
  category: string
  difficulty: string
  description: string
  starterCode: string | null
  timeLimitMs: number
  memoryLimitKB: number
  status: string
  subjectId: string | null
  unitId: string | null
  topicId: string | null
  lessonId: string | null
  sourceEvidence: string | null
  createdAt: Date
  subject: CodingSubjectMeta | null
  unit: CodingUnitMeta | null
  topic: CodingTopicMeta | null
  lesson: CodingLessonMeta | null
}

const codingChallengeContextSelect = {
  id: true,
  title: true,
  subjectId: true,
  unitId: true,
  topicId: true,
  lessonId: true,
  unit: { select: { id: true, subjectId: true } },
  topic: {
    select: {
      id: true,
      unitId: true,
      unit: { select: { id: true, subjectId: true } },
    },
  },
  lesson: {
    select: {
      id: true,
      unitId: true,
      topicId: true,
      unit: { select: { id: true, subjectId: true } },
      topic: {
        select: {
          id: true,
          unitId: true,
          unit: { select: { id: true, subjectId: true } },
        },
      },
    },
  },
} as const

function toCodingChallengeDto(challenge: CodingChallengeListRow) {
  const context = codingChallengeContextFromRecord(challenge)
  const subject =
    challenge.subject ??
    challenge.unit?.subject ??
    challenge.topic?.unit.subject ??
    challenge.lesson?.unit?.subject ??
    challenge.lesson?.topic?.unit.subject ??
    null
  const unit =
    challenge.unit ??
    challenge.topic?.unit ??
    challenge.lesson?.unit ??
    challenge.lesson?.topic?.unit ??
    null
  const topic = challenge.topic ?? challenge.lesson?.topic ?? null

  return {
    id: challenge.id,
    title: challenge.title,
    category: challenge.category,
    difficulty: challenge.difficulty,
    description: challenge.description,
    starterCode: challenge.starterCode,
    timeLimitMs: challenge.timeLimitMs,
    memoryLimitKB: challenge.memoryLimitKB,
    status: challenge.status,
    sourceEvidence: challenge.sourceEvidence,
    createdAt: challenge.createdAt,
    curriculum: {
      ...context,
      subjectCode: subject?.code ?? null,
      subjectName: subject?.name ?? null,
      unitNumber: unit?.number ?? null,
      unitTitle: unit?.title ?? null,
      topicSlug: topic?.slug ?? null,
      topicTitle: topic?.title ?? null,
      lessonTitle: challenge.lesson?.title ?? null,
    },
  }
}

/**
 * Zod validation schemas for every API request body.
 *
 * Rule: NEVER spread an untrusted request body directly into a Prisma write.
 * Always parse with these schemas first and use only the validated fields.
 */
import 'server-only'
import { z } from 'zod'
import { ApiError } from '@/lib/auth'

const DEFAULT_BODY_LIMIT_BYTES = 256 * 1024
const COMMON_WEAK_PASSWORDS = new Set([
  'password',
  'password123',
  'student123',
  'student1234',
  'qwerty123',
  'qwerty12345',
  'letmein123',
  'welcome123',
  'admin123',
  'lernio123',
])

export const passwordPolicySchema = z
  .string()
  .min(12, 'Password must be at least 12 characters.')
  .max(128, 'Password must be 128 characters or fewer.')
  .refine((value) => !COMMON_WEAK_PASSWORDS.has(value.trim().toLowerCase()), {
    message: 'Choose a less common password or use a longer passphrase.',
  })
  .refine((value) => value.trim().length >= 16 || (/[A-Za-z]/.test(value) && /\d/.test(value)), {
    message: 'Use at least one letter and one number, or choose a longer passphrase.',
  })

export function assertRequestBodySize(req: Request, maxBytes = DEFAULT_BODY_LIMIT_BYTES) {
  const length = req.headers.get('content-length')
  if (!length) return

  const bytes = Number(length)
  if (Number.isFinite(bytes) && bytes > maxBytes) {
    throw new ApiError('PAYLOAD_TOO_LARGE', 'Request body is too large.', 413, false)
  }
}

// ============================================================
// AUTH
// ============================================================

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
})

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(32).max(256),
  password: passwordPolicySchema,
})

export const verifyEmailRequestSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
})

// ============================================================
// USER / PROFILE
// ============================================================

/** Student-editable profile fields only. XP/level/streak/role are NOT here. */
export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  preferredLang: z.enum(['en', 'hi', 'mr']).optional(),
  examDate: z.string().nullable().optional(),
  dailyMins: z.number().int().min(5).max(600).optional(),
  semesterNumber: z.number().int().min(1).max(8).optional(),
  institutionId: z.string().nullable().optional(),
  schemeId: z.string().nullable().optional(),
  avatar: z.string().url().nullable().optional(),
  onboarded: z.boolean().optional(),
})

// ============================================================
// PROGRESS — practice question attempt
// ============================================================

/** Browser submits only the ANSWER — server evaluates correctness. */
export const questionAttemptSchema = z.object({
  questionId: z.string().min(1),
  userAnswer: z.string().nullable(),
  timeTakenMs: z.number().int().min(0).optional(),
  hintUsed: z.boolean().optional(),
  confidence: z.number().min(0).max(1).optional(),
  context: z.enum(['practice', 'chapter_test', 'mock_exam', 'diagnostic']).optional(),
  topicId: z.string().optional(),
})

// ============================================================
// LESSON COMPLETION
// ============================================================

export const lessonCompletionSchema = z.object({
  lessonId: z.string().min(1),
  mode: z.enum(['learn', 'simplify', 'visualise', 'practise', 'revise']),
  progress: z.number().min(0).max(100).optional(),
  scrollPos: z.number().min(0).optional(),
  completed: z.boolean().optional(),
})

// ============================================================
// EXAMS — quiz attempt submission
// ============================================================

/** Server re-scores from answersJson; ignores any client-supplied score. */
export const quizAttemptSchema = z.object({
  subjectId: z.string().min(1),
  mode: z.enum(['practice', 'chapter_test', 'mock_exam']),
  unitNumbers: z.array(z.number().int()).optional(),
  durationMs: z.number().int().min(0).optional(),
  answersJson: z.array(
    z.object({
      questionId: z.string(),
      answer: z.string().nullable(),
      timeTakenMs: z.number().int().min(0).optional(),
      hintUsed: z.boolean().optional(),
      flagged: z.boolean().optional(),
    }),
  ),
})

// ============================================================
// EXAMS — attempt lifecycle (DEBUG-3)
// create -> autosave -> submit -> lock
// ============================================================

/**
 * POST /api/exams/attempt — start a new exam attempt.
 * The server loads + stores the question set so the client never needs to
 * re-fetch (and so submit can re-score against the exact same set).
 */
export const createAttemptSchema = z.object({
  subjectId: z.string().min(1),
  questionPaperId: z.string().min(1).optional(),
  mode: z.enum(['mock', 'chapter']),
  // For chapter mode: optional filters the server applies when picking
  // random questions from the subject's bank.
  unitNumbers: z.array(z.number().int().min(1).max(20)).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  questionCount: z.number().int().min(1).max(100).optional(),
  durationMins: z.number().int().min(1).max(300).optional(),
})

/**
 * PATCH /api/exams/attempt/[id] — autosave in-progress answers.
 * Server stores { answers, flagged, timeLeftSec, currentIdx } in answersJson.
 */
export const autosaveAttemptSchema = z.object({
  answers: z.record(z.string(), z.string()),
  flagged: z.array(z.string()).optional(),
  timeLeftSec: z.number().int().min(0).optional(),
  currentIdx: z.number().int().min(0).optional(),
})

/**
 * POST /api/exams/attempt/[id]/submit — lock + score.
 * Server re-scores against the stored question set; ignores any prior score.
 */
export const submitAttemptSchema = z.object({
  answers: z.record(z.string(), z.string()),
  flagged: z.array(z.string()).optional(),
  durationMs: z.number().int().min(0).optional(),
})

// ============================================================
// TUTOR
// ============================================================

export const createTutorSessionSchema = z.object({
  title: z.string().max(200).optional(),
  mode: z.string().max(100).optional(),
  language: z.enum(['en', 'hi', 'mr']).optional(),
  subjectId: z.string().optional(),
  unitNumber: z.number().int().optional(),
  topicId: z.string().optional(),
})

export const updateTutorSessionSchema = z.object({
  title: z.string().max(200).optional(),
  mode: z.string().max(100).optional(),
  language: z.enum(['en', 'hi', 'mr']).optional(),
  archived: z.boolean().optional(),
})

export const tutorChatSchema = z.object({
  sessionId: z.string().min(1),
  clientMessageId: z.string().uuid(),
  message: z.string().min(1).max(8000),
  mode: z.string().optional(),
  subjectName: z.string().optional(),
  unitTitle: z.string().optional(),
  topicTitle: z.string().optional(),
})

// ============================================================
// PLANNER
// ============================================================

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  type: z.enum(['learn', 'practice', 'revision', 'lab', 'coding', 'mock_exam', 'buffer']).optional(),
  subjectId: z.string().optional(),
  topicId: z.string().optional(),
  durationMins: z.number().int().min(5).max(480).optional(),
  scheduledDate: z.string().optional(), // YYYY-MM-DD
  scheduledTime: z.string().optional(), // HH:mm
  priority: z.number().int().min(0).max(4).optional(),
})

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  type: z.enum(['learn', 'practice', 'revision', 'lab', 'coding', 'mock_exam', 'buffer']).optional(),
  subjectId: z.string().nullable().optional(),
  topicId: z.string().nullable().optional(),
  durationMins: z.number().int().min(5).max(480).optional(),
  scheduledDate: z.string().nullable().optional(),
  scheduledTime: z.string().nullable().optional(),
  priority: z.number().int().min(0).max(4).optional(),
  completed: z.boolean().optional(),
})

export const bulkCreateTasksSchema = z.object({
  tasks: z.array(createTaskSchema).min(1).max(50),
  replaceDateRange: z
    .object({
      start: z.string(),
      end: z.string(),
    })
    .optional(),
})

/**
 * Auto-plan request.
 * - regenerate: when true, the engine first deletes all of the user's
 *   FUTURE UNCOMPLETED tasks (completedAt == null AND scheduledDate >= today)
 *   in the same transaction, then inserts the freshly generated plan.
 *   When false, a dedup guard skips any draft whose (scheduledDate, title)
 *   already exists for the user.
 */
export const autoPlanSchema = z.object({
  regenerate: z.boolean().default(false),
})

// ============================================================
// REVISION
// ============================================================

export const revisionReviewSchema = z.object({
  scheduleId: z.string().min(1),
  quality: z.number().int().min(0).max(5),
  activityType: z
    .enum(['flashcard', 'recall', 'mistake_review', 'short_notes', 'formula_recall', 'mini_quiz'])
    .optional(),
  correct: z.boolean().optional(),
})

export const revisionSnoozeSchema = z.object({
  scheduleId: z.string().min(1),
  days: z.number().int().min(1).max(30),
})

// ============================================================
// MATERIALS / CONTRIBUTIONS
// ============================================================

export const createContributionSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.enum([
    'pdf',
    'docx',
    'image',
    'text',
    'video_link',
    'web_link',
    'code',
    'lab_manual',
    'question_paper',
    'model_answer',
  ]),
  subjectId: z.string().min(1),
  unitNumber: z.number().int().optional(),
  topicId: z.string().optional(),
  content: z.string().max(100000).optional(),
  fileUrl: z.string().url().optional(),
  copyrightAcknowledged: z.boolean().refine((v) => v === true, {
    message: 'You must acknowledge the copyright declaration.',
  }),
})

/** Student may only edit draft content fields — never status/moderator fields. */
export const updateContributionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().max(100000).optional(),
  fileUrl: z.string().url().optional(),
  // status transitions the student is allowed to make themselves:
  submit: z.boolean().optional(), // draft -> submitted
  withdraw: z.boolean().optional(), // any -> archived
})

/** Moderator-only: transition contribution through review states. */
export const moderateContributionSchema = z.object({
  status: z.enum(['under_review', 'requires_changes', 'approved', 'rejected']),
  moderatorNote: z.string().max(2000).optional(),
})

// ============================================================
// CODING
// ============================================================

export const codingRunSchema = z.object({
  code: z.string().min(1).max(50000),
  language: z.enum(['cpp', 'c', 'python']).default('cpp'),
})

export const codingSubmitSchema = z.object({
  challengeId: z.string().min(1),
  code: z.string().min(1).max(50000),
  language: z.enum(['cpp', 'c', 'python']).default('cpp'),
})

// ============================================================
// FEEDBACK
// ============================================================

export const messageFeedbackSchema = z.object({
  messageId: z.string().min(1),
  feedback: z.enum(['up', 'down']),
})

// ============================================================
// ROLE REQUESTS
// ============================================================

export const createRoleRequestSchema = z.object({
  requestedRole: z.enum(['cr', 'teacher', 'coordinator', 'moderator', 'reviewer']),
  reason: z.string().trim().min(10).max(2000).optional(),
  departmentCode: z.string().trim().max(32).optional(),
  subjectIds: z.array(z.string().min(1)).max(20).optional(),
})

// ============================================================
// HELPER
// ============================================================

/** Parse a JSON request body against a schema; throws ApiError on failure. */
export async function parseBody<T>(
  req: Request,
  schema: z.ZodSchema<T>,
  options: { maxBytes?: number } = {},
): Promise<T> {
  assertRequestBodySize(req, options.maxBytes)

  let json: unknown
  try {
    json = await req.json()
  } catch {
    throw new ApiError('BAD_REQUEST', 'Invalid request body.', 400, false)
  }
  const result = schema.safeParse(json)
  if (!result.success) {
    const first = result.error.issues[0]
    throw new ApiError(
      'VALIDATION_ERROR',
      first?.message ?? 'Validation failed.',
      400,
      false,
    )
  }
  return result.data
}

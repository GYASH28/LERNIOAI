import 'server-only'

import { db } from '@/lib/db'

export const LEARNING_EVENT_TYPES = [
  'video_started',
  'video_progressed',
  'video_completed',
  'lesson_completed',
  'material_opened',
  'material_section_completed',
  'quiz_started',
  'quiz_answered',
  'quiz_completed',
  'question_incorrect',
  'notebook_entry_created',
  'flashcard_reviewed',
  'revision_session_completed',
  'focus_session_completed',
  'planner_task_completed',
  'tutor_help_requested',
] as const

export type LearningEventType = (typeof LEARNING_EVENT_TYPES)[number]

export interface LearningEventContext {
  programmeCode?: string | null
  semesterNumber?: number | null
  subjectId?: string | null
  unitNumber?: number | null
  lessonId?: string | null
}

export interface RecordLearningEventInput extends LearningEventContext {
  userId: string
  type: LearningEventType
  idempotencyKey: string
  sourceRoute: string
  payload?: Record<string, unknown>
  occurredAt?: Date
}

const EVENT_TYPES = new Set<string>(LEARNING_EVENT_TYPES)
const MAX_IDEMPOTENCY_KEY_LENGTH = 240
const MAX_SOURCE_ROUTE_LENGTH = 500
const MAX_PAYLOAD_BYTES = 32_000

export async function recordLearningEvent(input: RecordLearningEventInput) {
  assertLearningEvent(input)
  const payloadJson = input.payload ? JSON.stringify(input.payload) : null
  if (payloadJson && Buffer.byteLength(payloadJson, 'utf8') > MAX_PAYLOAD_BYTES) {
    throw new Error('Learning event payload exceeds 32 KB.')
  }

  return db.learningEvent.upsert({
    where: {
      userId_idempotencyKey: {
        userId: input.userId,
        idempotencyKey: input.idempotencyKey,
      },
    },
    update: {},
    create: {
      userId: input.userId,
      type: input.type,
      idempotencyKey: input.idempotencyKey,
      occurredAt: input.occurredAt,
      programmeCode: input.programmeCode || null,
      semesterNumber: input.semesterNumber ?? null,
      subjectId: input.subjectId || null,
      unitNumber: input.unitNumber ?? null,
      lessonId: input.lessonId || null,
      sourceRoute: input.sourceRoute,
      payloadJson,
      schemaVersion: 1,
    },
  })
}

export async function recordLearningEvents(inputs: RecordLearningEventInput[]) {
  if (inputs.length === 0) return { count: 0 }
  const data = inputs.map((input) => {
    assertLearningEvent(input)
    const payloadJson = input.payload ? JSON.stringify(input.payload) : null
    if (payloadJson && Buffer.byteLength(payloadJson, 'utf8') > MAX_PAYLOAD_BYTES) {
      throw new Error('Learning event payload exceeds 32 KB.')
    }
    return {
      userId: input.userId,
      type: input.type,
      idempotencyKey: input.idempotencyKey,
      occurredAt: input.occurredAt,
      programmeCode: input.programmeCode || null,
      semesterNumber: input.semesterNumber ?? null,
      subjectId: input.subjectId || null,
      unitNumber: input.unitNumber ?? null,
      lessonId: input.lessonId || null,
      sourceRoute: input.sourceRoute,
      payloadJson,
      schemaVersion: 1,
    }
  })
  return db.learningEvent.createMany({ data, skipDuplicates: true })
}

export async function getLessonEventContext(lessonId: string): Promise<LearningEventContext> {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    select: {
      unit: {
        select: {
          number: true,
          subject: {
            select: {
              id: true,
              semester: {
                select: {
                  number: true,
                  scheme: { select: { programme: { select: { code: true } } } },
                },
              },
            },
          },
        },
      },
      topic: {
        select: {
          unit: {
            select: {
              number: true,
              subject: {
                select: {
                  id: true,
                  semester: {
                    select: {
                      number: true,
                      scheme: { select: { programme: { select: { code: true } } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  const unit = lesson?.unit ?? lesson?.topic?.unit
  return {
    lessonId,
    unitNumber: unit?.number ?? null,
    subjectId: unit?.subject.id ?? null,
    semesterNumber: unit?.subject.semester.number ?? null,
    programmeCode: unit?.subject.semester.scheme.programme?.code ?? null,
  }
}

export async function getSubjectEventContext(
  subjectId: string,
  unitNumber?: number | null,
): Promise<LearningEventContext> {
  const subject = await db.subject.findUnique({
    where: { id: subjectId },
    select: {
      semester: {
        select: {
          number: true,
          scheme: { select: { programme: { select: { code: true } } } },
        },
      },
    },
  })
  return {
    subjectId,
    unitNumber: unitNumber ?? null,
    semesterNumber: subject?.semester.number ?? null,
    programmeCode: subject?.semester.scheme.programme?.code ?? null,
  }
}

export function learningSourceRoute(req: Pick<Request, 'headers'>, fallback: string) {
  const referer = req.headers.get('referer')
  if (!referer) return fallback
  try {
    const url = new URL(referer)
    return `${url.pathname}${url.search}`.slice(0, MAX_SOURCE_ROUTE_LENGTH)
  } catch {
    return fallback
  }
}

function assertLearningEvent(input: RecordLearningEventInput) {
  if (!input.userId) throw new Error('Learning event user ID is required.')
  if (!EVENT_TYPES.has(input.type)) throw new Error('Unsupported learning event type.')
  if (!input.idempotencyKey || input.idempotencyKey.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
    throw new Error('Learning event idempotency key is invalid.')
  }
  if (!input.sourceRoute || input.sourceRoute.length > MAX_SOURCE_ROUTE_LENGTH) {
    throw new Error('Learning event source route is invalid.')
  }
  if (input.semesterNumber != null && (input.semesterNumber < 1 || input.semesterNumber > 12)) {
    throw new Error('Learning event semester is invalid.')
  }
  if (input.unitNumber != null && input.unitNumber < 1) {
    throw new Error('Learning event unit is invalid.')
  }
}

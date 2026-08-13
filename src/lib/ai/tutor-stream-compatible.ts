import 'server-only'

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ApiError, requireUser, withApi } from '@/lib/auth'
import { parseBody, tutorChatSchema } from '@/lib/schemas'
import { checkRateLimit } from '@/lib/rate-limit'
import { awardXp } from '@/lib/xp'
import {
  retrieveLessonContext,
  chunksToCitations,
  chunksToContextBlock,
} from '@/lib/ai/retrieval'
import {
  mapCitationsToAnswer,
  type Citation,
  type TutorMessage as ProviderMessage,
} from '@/lib/ai/provider'
import { AiRouterError, streamTutorChat } from '@/lib/ai/stream-router'
import {
  buildTutorSystemPrompt,
  createTutorSessionTitle,
  tutorMaxTokens,
  tutorModelProfile,
} from '@/lib/ai/tutor-runtime'
import { encodeTutorStreamEvent, type TutorStreamEvent } from '@/lib/ai/stream-protocol'
import { DEMO_TUTOR_SESSIONS, isDemoMode } from '@/lib/demo-fixtures'
import type { TutorMessage, TutorSession } from '@/lib/types'
import {
  getSubjectEventContext,
  learningSourceRoute,
  recordLearningEvent,
} from '@/lib/learning-events'
import {
  findScopedTopic,
  findScopedUnit,
  getStudentLearningScope,
  isSubjectIdInLearningScope,
  subjectIdsForLearningScope,
} from '@/features/learning/server/get-student-learning-scope'

interface ChatBody {
  sessionId: string
  clientMessageId: string
  message: string
  mode?: string
  subjectName?: string
  unitTitle?: string
  topicTitle?: string
}

interface ResolvedTutorSession {
  id: string
  userId?: string
  title: string
  subjectId?: string | null
  unitNumber?: number | null
  topicId?: string | null
  messages: Array<{ role: string; content: string }>
}

type SafeStoredMessage = {
  id: string
  role: string
  content: string
  mode: string | null
  groundingStatus: string | null
  citations: string | null
  followUps: string | null
  feedback: string | null
}

const encoder = new TextEncoder()

const safeMessageSelect = {
  id: true,
  role: true,
  content: true,
  mode: true,
  groundingStatus: true,
  citations: true,
  followUps: true,
  feedback: true,
} as const

export async function handleTutorStream(req: NextRequest) {
  return withApi(async () => {
    const user = await requireUser()
    const body = (await parseBody(req, tutorChatSchema, {
      maxBytes: 32 * 1024,
    })) as ChatBody
    const cleanMessage = body.message.trim()
    const mode = body.mode || 'explain_simple'
    const demo = isDemoMode()

    const session = demo
      ? resolveDemoSession(body.sessionId)
      : await resolvePersistedSession(body.sessionId)

    if (!session || (!demo && session.userId !== user.id)) {
      throw new ApiError('NOT_FOUND', 'Tutor session not found.', 404, false)
    }
    const learningScope = demo ? null : await getStudentLearningScope(user.id)
    if (!demo && session.subjectId && !isSubjectIdInLearningScope(learningScope, session.subjectId)) {
      throw new ApiError('NOT_FOUND', 'Tutor session not found.', 404, false)
    }
    if (!demo && session.subjectId && session.unitNumber) {
      const unit = await findScopedUnit(learningScope!, {
        subjectId: session.subjectId,
        unitNumber: session.unitNumber,
      })
      if (!unit) throw new ApiError('NOT_FOUND', 'Tutor session not found.', 404, false)
    }
    if (!demo && session.topicId) {
      const topic = await findScopedTopic(learningScope!, {
        topicId: session.topicId,
        subjectId: session.subjectId,
        unitNumber: session.unitNumber,
      })
      if (!topic) throw new ApiError('NOT_FOUND', 'Tutor session not found.', 404, false)
    }

    let idempotencySupported = !demo

    if (!demo) {
      try {
        const existingAssistant = await db.tutorMessage.findFirst({
          where: {
            sessionId: body.sessionId,
            role: 'assistant',
            clientMessageId: body.clientMessageId,
          },
          orderBy: { createdAt: 'desc' },
          select: safeMessageSelect,
        })

        if (existingAssistant) {
          return completedStream({
            message: toTutorMessage(existingAssistant, body.clientMessageId),
            sessionTitle: session.title,
            deduplicated: true,
          })
        }

        const existingUser = await db.tutorMessage.findFirst({
          where: {
            sessionId: body.sessionId,
            role: 'user',
            clientMessageId: body.clientMessageId,
          },
          select: { id: true, createdAt: true },
        })

        if (existingUser) {
          const stale = Date.now() - existingUser.createdAt.getTime() > 2 * 60 * 1000
          if (!stale) {
            throw new ApiError(
              'REQUEST_IN_PROGRESS',
              'This tutor request is already being processed. Please wait a moment.',
              409,
              true,
            )
          }
          await db.tutorMessage.delete({ where: { id: existingUser.id } })
        }
      } catch (error) {
        if (isMissingClientMessageIdColumn(error)) {
          idempotencySupported = false
          console.warn('[tutor/stream] clientMessageId column is not deployed yet; using compatibility mode')
        } else {
          throw error
        }
      }
    }

    const limiter = await checkRateLimit({
      action: 'ai_tutor_stream',
      identifier: user.id,
      limit: 45,
      windowMs: 60 * 60 * 1000,
    })
    if (!limiter.allowed) {
      throw new ApiError(
        'RATE_LIMITED',
        `LEO has reached the hourly learning limit. Try again in ${limiter.retryAfterSec} seconds.`,
        429,
        true,
      )
    }

    let userMessageId: string | null = null
    let persistenceAvailable = !demo

    if (!demo) {
      try {
        userMessageId = await createUserMessage({
          sessionId: body.sessionId,
          clientMessageId: body.clientMessageId,
          content: cleanMessage,
          mode,
          includeClientMessageId: idempotencySupported,
        })
      } catch (error) {
        if (idempotencySupported && isMissingClientMessageIdColumn(error)) {
          idempotencySupported = false
          userMessageId = await createUserMessage({
            sessionId: body.sessionId,
            clientMessageId: body.clientMessageId,
            content: cleanMessage,
            mode,
            includeClientMessageId: false,
          })
        } else {
          persistenceAvailable = false
          console.error('[tutor/stream] user message persistence unavailable; continuing ephemerally', error)
        }
      }
    }

    let chunks: Awaited<ReturnType<typeof retrieveLessonContext>> = []
    try {
      chunks = await retrieveLessonContext({
        subjectId: session.subjectId ?? undefined,
        unitNumber: session.unitNumber ?? undefined,
        topicId: session.topicId ?? undefined,
        subjectName: session.subjectId ? undefined : body.subjectName,
        unitTitle: session.unitNumber ? undefined : body.unitTitle,
        topicTitle: session.topicId ? undefined : body.topicTitle,
        allowedSubjectIds: subjectIdsForLearningScope(learningScope),
      })
    } catch (error) {
      console.error('[tutor/stream] course retrieval unavailable; continuing with general knowledge', error)
    }

    const contextBlock = chunksToContextBlock(chunks)
    const citations: Citation[] = chunksToCitations(chunks)
    const primaryCitation = citations[0]
    const academicContext = [
      primaryCitation?.subject || body.subjectName
        ? `Subject: ${primaryCitation?.subject || body.subjectName}`
        : '',
      primaryCitation?.unit || body.unitTitle
        ? `Unit: ${primaryCitation?.unit || body.unitTitle}`
        : '',
      primaryCitation?.topic || body.topicTitle
        ? `Topic: ${primaryCitation?.topic || body.topicTitle}`
        : '',
    ]
      .filter(Boolean)
      .join('\n')

    const systemPrompt = buildTutorSystemPrompt({
      mode,
      academicContext,
      contextBlock,
      citations,
    })
    const history: ProviderMessage[] = session.messages
      .slice()
      .reverse()
      .map((stored) => ({
        role: stored.role === 'assistant' ? 'assistant' : 'user',
        content: stored.content,
      }))
    const modelProfile = tutorModelProfile(mode)
    const requestId = crypto.randomUUID()
    const startedAt = Date.now()
    const eventContext = session.subjectId
      ? await getSubjectEventContext(session.subjectId, session.unitNumber)
      : {}
    const sourceRoute = learningSourceRoute(req, '/tutor')

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let content = ''
        let firstTokenAt: number | null = null
        let completed = false

        const push = (event: TutorStreamEvent) => {
          controller.enqueue(encoder.encode(encodeTutorStreamEvent(event)))
        }

        push({ type: 'meta', requestId, modelProfile, startedAt })

        try {
          for await (const token of streamTutorChat({
            systemPrompt,
            messages: [...history, { role: 'user', content: cleanMessage }],
            maxTokens: tutorMaxTokens(mode),
            profile: modelProfile,
            signal: req.signal,
          })) {
            if (!firstTokenAt) firstTokenAt = Date.now()
            content += token
            push({ type: 'delta', text: token })
          }

          const finalContent = content.trim()
          if (!finalContent) {
            throw new AiRouterError(
              'EMPTY_AI_RESPONSE',
              502,
              true,
              'LEO returned an empty response. Please retry.',
            )
          }

          const grounded = mapCitationsToAnswer(finalContent, citations)
          const followUps = buildFollowUps(mode, primaryCitation?.topic || body.topicTitle)
          const shouldRename = !session.title || session.title === 'New session'
          const sessionTitle = shouldRename
            ? createTutorSessionTitle(cleanMessage)
            : session.title

          let saved: TutorMessage = {
            id: `ephemeral-assistant-${requestId}`,
            clientMessageId: body.clientMessageId,
            role: 'assistant',
            content: grounded.content,
            mode,
            groundingStatus: grounded.groundingStatus,
            citations: grounded.citations.length
              ? JSON.stringify(grounded.citations)
              : null,
            followUps: JSON.stringify(followUps),
          }
          let persisted = false

          if (demo) {
            saved.id = `demo-assistant-${Date.now()}`
          } else if (persistenceAvailable) {
            try {
              const result = await persistAssistant({
                sessionId: body.sessionId,
                clientMessageId: body.clientMessageId,
                mode,
                content: grounded.content,
                groundingStatus: grounded.groundingStatus,
                citations: saved.citations ?? null,
                followUps: saved.followUps ?? null,
                sessionTitle,
                shouldRename,
                includeClientMessageId: idempotencySupported,
              })
              saved = toTutorMessage(result, body.clientMessageId)
              persisted = true
            } catch (error) {
              if (idempotencySupported && isMissingClientMessageIdColumn(error)) {
                try {
                  const result = await persistAssistant({
                    sessionId: body.sessionId,
                    clientMessageId: body.clientMessageId,
                    mode,
                    content: grounded.content,
                    groundingStatus: grounded.groundingStatus,
                    citations: saved.citations ?? null,
                    followUps: saved.followUps ?? null,
                    sessionTitle,
                    shouldRename,
                    includeClientMessageId: false,
                  })
                  saved = toTutorMessage(result, body.clientMessageId)
                  persisted = true
                } catch (retryError) {
                  console.error('[tutor/stream] compatibility persistence failed; returning ephemeral answer', retryError)
                }
              } else {
                console.error('[tutor/stream] assistant persistence failed; returning ephemeral answer', error)
              }
            }
          }

          if (persisted) {
            await awardXp({
              userId: user.id,
              eventType: 'tutor_interaction',
              amount: 5,
              idempotencyKey: `tutor_message:${body.sessionId}:${body.clientMessageId}`,
              sourceId: saved.id,
            }).catch((error) => {
              console.error('[tutor/stream] XP award failed after successful response', error)
            })
            await recordLearningEvent({
              userId: user.id,
              type: 'tutor_help_requested',
              idempotencyKey: `tutor_help_requested:${body.sessionId}:${body.clientMessageId}`,
              sourceRoute,
              ...eventContext,
              payload: {
                sessionId: body.sessionId,
                clientMessageId: body.clientMessageId,
                mode,
                groundingStatus: grounded.groundingStatus,
                citationCount: grounded.citations.length,
              },
            }).catch((error) => {
              console.error('[tutor/stream] learning event persistence failed', error)
            })
          }

          completed = true
          push({
            type: 'done',
            message: saved,
            sessionTitle,
            firstTokenMs: firstTokenAt ? firstTokenAt - startedAt : undefined,
            totalMs: Date.now() - startedAt,
          })
        } catch (error) {
          // Audit fix #26 (CVSS 2.2): previously, this catch path deleted the
          // user message even when the client had disconnected mid-stream.
          // That was the wrong behaviour — we want to KEEP the user message
          // and delete the partial assistant response instead, so the user
          // can resume the conversation. The client-disconnect case is now
          // detected via req.signal.aborted and handled differently.
          const clientAborted = req.signal.aborted
          if (!demo && userMessageId && !completed && !clientAborted) {
            await db.tutorMessage.delete({ where: { id: userMessageId } }).catch(() => {})
          }
          if (!clientAborted) {
            push(normaliseStreamError(error, requestId))
          }
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Accel-Buffering': 'no',
        Connection: 'keep-alive',
      },
    })
  })
}

async function resolvePersistedSession(sessionId: string): Promise<ResolvedTutorSession | null> {
  const session = await db.tutorSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      userId: true,
      title: true,
      subjectId: true,
      unitNumber: true,
      topicId: true,
      messages: {
        where: { role: { in: ['user', 'assistant'] } },
        orderBy: { createdAt: 'desc' },
        take: 16,
        select: { role: true, content: true },
      },
    },
  })
  if (!session) return null
  return session
}

async function createUserMessage(input: {
  sessionId: string
  clientMessageId: string
  content: string
  mode: string
  includeClientMessageId: boolean
}) {
  const stored = await db.tutorMessage.create({
    data: {
      sessionId: input.sessionId,
      role: 'user',
      content: input.content,
      mode: input.mode,
      ...(input.includeClientMessageId
        ? { clientMessageId: input.clientMessageId }
        : {}),
    },
    select: { id: true },
  })
  return stored.id
}

async function persistAssistant(input: {
  sessionId: string
  clientMessageId: string
  mode: string
  content: string
  groundingStatus: string
  citations: string | null
  followUps: string | null
  sessionTitle: string
  shouldRename: boolean
  includeClientMessageId: boolean
}): Promise<SafeStoredMessage> {
  return db.$transaction(async (tx) => {
    const assistant = await tx.tutorMessage.create({
      data: {
        sessionId: input.sessionId,
        role: 'assistant',
        content: input.content,
        mode: input.mode,
        groundingStatus: input.groundingStatus,
        citations: input.citations,
        followUps: input.followUps,
        ...(input.includeClientMessageId
          ? { clientMessageId: input.clientMessageId }
          : {}),
      },
      select: safeMessageSelect,
    })

    await tx.tutorSession.update({
      where: { id: input.sessionId },
      data: {
        mode: input.mode,
        ...(input.shouldRename ? { title: input.sessionTitle } : {}),
        updatedAt: new Date(),
      },
    })

    return assistant
  })
}

function toTutorMessage(message: SafeStoredMessage, clientMessageId: string): TutorMessage {
  return {
    id: message.id,
    clientMessageId,
    role: message.role,
    content: message.content,
    mode: message.mode,
    groundingStatus: message.groundingStatus,
    citations: message.citations,
    followUps: message.followUps,
    feedback: message.feedback,
  }
}

function isMissingClientMessageIdColumn(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const candidate = error as {
    code?: unknown
    message?: unknown
    meta?: { column?: unknown; field_name?: unknown }
  }
  if (candidate.code !== 'P2022') return false
  const detail = [candidate.message, candidate.meta?.column, candidate.meta?.field_name]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
  return /clientMessageId/i.test(detail)
}

function resolveDemoSession(sessionId: string): ResolvedTutorSession | null {
  const fixture = (DEMO_TUTOR_SESSIONS as TutorSession[]).find(
    (item) => item.id === sessionId,
  )
  if (fixture) {
    return {
      id: fixture.id,
      title: fixture.title,
      subjectId: fixture.subjectId,
      unitNumber: fixture.unitNumber,
      topicId: fixture.topicId,
      messages: (fixture.messages || []).map((message) => ({
        role: message.role,
        content: message.content,
      })),
    }
  }
  if (!sessionId.startsWith('demo-session-')) return null
  return {
    id: sessionId,
    title: 'New session',
    messages: [],
  }
}

function buildFollowUps(mode: string, topic?: string) {
  const subject = topic ? ` about ${topic}` : ''
  if (mode === 'hint_only') return ['Give me one more hint', 'Now show the full solution']
  if (mode === 'ask_me' || mode === 'conduct_viva') {
    return ['Ask the next question', 'Explain the previous answer']
  }
  if (mode === 'debug_code') return ['Show the corrected code', 'Explain the time complexity']
  if (mode === 'exam_answer') {
    return ['Convert this into 3-mark notes', 'Give me a diagram description']
  }
  return [`Quiz me${subject}`, 'Create short revision notes', 'Explain with another example']
}

function normaliseStreamError(
  error: unknown,
  requestId: string,
): Extract<TutorStreamEvent, { type: 'error' }> {
  if (error instanceof AiRouterError) {
    return {
      type: 'error',
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      requestId,
    }
  }

  console.error('[tutor/stream] unexpected error', error)
  return {
    type: 'error',
    code: 'AI_STREAM_FAILED',
    message: 'LEO could not complete the response. Please retry.',
    retryable: true,
    requestId,
  }
}

function completedStream(input: {
  message: TutorMessage
  sessionTitle?: string
  deduplicated: boolean
}) {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(
        encoder.encode(
          encodeTutorStreamEvent({
            type: 'done',
            message: input.message,
            sessionTitle: input.sessionTitle,
            totalMs: 0,
            deduplicated: input.deduplicated,
          }),
        ),
      )
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  })
}

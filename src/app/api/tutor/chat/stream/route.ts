import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, withApi, ApiError } from '@/lib/auth'
import { parseBody, tutorChatSchema } from '@/lib/schemas'
import { awardXp } from '@/lib/xp'
import { checkRateLimit } from '@/lib/rate-limit'
import {
  retrieveLessonContext,
  chunksToCitations,
  chunksToContextBlock,
} from '@/lib/ai/retrieval'
import { mapCitationsToAnswer, type Citation, type TutorMessage as ProviderMessage } from '@/lib/ai/provider'
import { GroqStreamError, streamGroqChat } from '@/lib/ai/groq-stream'
import {
  buildTutorSystemPrompt,
  createTutorSessionTitle,
  tutorMaxTokens,
  tutorModelProfile,
} from '@/lib/ai/tutor-runtime'
import { encodeTutorStreamEvent, type TutorStreamEvent } from '@/lib/ai/stream-protocol'
import { DEMO_TUTOR_SESSIONS, isDemoMode } from '@/lib/demo-fixtures'
import type { TutorMessage, TutorSession } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 60

interface ChatBody {
  sessionId: string
  clientMessageId: string
  message: string
  mode?: string
  subjectName?: string
  unitTitle?: string
  topicTitle?: string
}

const encoder = new TextEncoder()

export async function POST(req: NextRequest) {
  return withApi(async () => {
    const user = await requireUser()
    const body = (await parseBody(req, tutorChatSchema, { maxBytes: 32 * 1024 })) as ChatBody
    const cleanMessage = body.message.trim()
    const mode = body.mode || 'explain_simple'
    const demo = isDemoMode()

    const session = demo
      ? resolveDemoSession(body.sessionId, mode)
      : await db.tutorSession.findUnique({
          where: { id: body.sessionId },
          include: {
            messages: {
              where: { role: { in: ['user', 'assistant'] } },
              orderBy: { createdAt: 'desc' },
              take: 16,
            },
          },
        })

    if (!session || (!demo && session.userId !== user.id)) {
      throw new ApiError('NOT_FOUND', 'Tutor session not found.', 404, false)
    }

    if (!demo) {
      const existingAssistant = await db.tutorMessage.findFirst({
        where: {
          sessionId: body.sessionId,
          role: 'assistant',
          clientMessageId: body.clientMessageId,
        },
        orderBy: { createdAt: 'desc' },
      })

      if (existingAssistant) {
        return completedStream({
          message: existingAssistant as unknown as TutorMessage,
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
    if (!demo) {
      const storedUser = await db.tutorMessage.create({
        data: {
          sessionId: body.sessionId,
          clientMessageId: body.clientMessageId,
          role: 'user',
          content: cleanMessage,
          mode,
        },
        select: { id: true },
      })
      userMessageId = storedUser.id
    }

    const chunks = await retrieveLessonContext({
      subjectId: session.subjectId ?? undefined,
      unitNumber: session.unitNumber ?? undefined,
      topicId: session.topicId ?? undefined,
      subjectName: session.subjectId ? undefined : body.subjectName,
      unitTitle: session.unitNumber ? undefined : body.unitTitle,
      topicTitle: session.topicId ? undefined : body.topicTitle,
    })
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
    const history: ProviderMessage[] = (session.messages || [])
      .slice()
      .reverse()
      .map((stored) => ({
        role: stored.role === 'assistant' ? 'assistant' : 'user',
        content: stored.content,
      }))
    const modelProfile = tutorModelProfile(mode)
    const requestId = crypto.randomUUID()
    const startedAt = Date.now()

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
          for await (const token of streamGroqChat({
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
            throw new GroqStreamError(
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

          let saved: TutorMessage
          if (demo) {
            saved = {
              id: `demo-assistant-${Date.now()}`,
              clientMessageId: body.clientMessageId,
              role: 'assistant',
              content: grounded.content,
              mode,
              groundingStatus: grounded.groundingStatus,
              citations: grounded.citations.length ? JSON.stringify(grounded.citations) : null,
              followUps: JSON.stringify(followUps),
            }
          } else {
            const stored = await db.$transaction(async (tx) => {
              const assistant = await tx.tutorMessage.create({
                data: {
                  sessionId: body.sessionId,
                  clientMessageId: body.clientMessageId,
                  role: 'assistant',
                  content: grounded.content,
                  mode,
                  groundingStatus: grounded.groundingStatus,
                  citations: grounded.citations.length
                    ? JSON.stringify(grounded.citations)
                    : null,
                  followUps: JSON.stringify(followUps),
                },
              })
              await tx.tutorSession.update({
                where: { id: body.sessionId },
                data: {
                  mode,
                  ...(shouldRename ? { title: sessionTitle } : {}),
                  updatedAt: new Date(),
                },
              })
              return assistant
            })
            saved = stored as unknown as TutorMessage

            await awardXp({
              userId: user.id,
              eventType: 'tutor_interaction',
              amount: 5,
              idempotencyKey: `tutor_message:${body.sessionId}:${body.clientMessageId}`,
              sourceId: stored.id,
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
          if (!demo && userMessageId && !completed) {
            await db.tutorMessage.delete({ where: { id: userMessageId } }).catch(() => {})
          }

          const streamError = normaliseStreamError(error, requestId)
          push(streamError)
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

function resolveDemoSession(sessionId: string, mode: string) {
  const fixture = DEMO_TUTOR_SESSIONS.find((item) => item.id === sessionId)
  if (fixture) return fixture as TutorSession & { userId?: string }
  if (!sessionId.startsWith('demo-session-')) return null
  const now = new Date().toISOString()
  return {
    id: sessionId,
    title: 'New session',
    mode,
    language: 'en',
    archived: false,
    createdAt: now,
    updatedAt: now,
    messages: [],
  } as TutorSession & { userId?: string }
}

function buildFollowUps(mode: string, topic?: string) {
  const subject = topic ? ` about ${topic}` : ''
  if (mode === 'hint_only') return ['Give me one more hint', 'Now show the full solution']
  if (mode === 'ask_me' || mode === 'conduct_viva') return ['Ask the next question', 'Explain the previous answer']
  if (mode === 'debug_code') return ['Show the corrected code', 'Explain the time complexity']
  if (mode === 'exam_answer') return ['Convert this into 3-mark notes', 'Give me a diagram description']
  return [`Quiz me${subject}`, 'Create short revision notes', 'Explain with another example']
}

function normaliseStreamError(error: unknown, requestId: string): Extract<TutorStreamEvent, { type: 'error' }> {
  if (error instanceof GroqStreamError) {
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

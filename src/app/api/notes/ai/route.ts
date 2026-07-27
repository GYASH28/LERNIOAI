import { NextRequest } from 'next/server'
import { requireUser, withApi, ApiError } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { streamGroqChat, GroqStreamError } from '@/lib/ai/groq-stream'
import { z } from 'zod'

export const runtime = 'nodejs'
export const maxDuration = 45

const notesAiSchema = z.object({
  action: z.enum(['explain','simplify','hinglish','marathi','eli10','eli5','examples','coding_exercise','quiz','flashcards','summary','ask']),
  subjectName: z.string().trim().max(200).optional(),
  lessonTitle: z.string().trim().max(300).optional(),
  lessonOverview: z.string().trim().max(4000).optional(),
  selection: z.string().trim().max(4000).optional(),
  question: z.string().trim().max(2000).optional(),
})

const ACTION_PROMPTS: Record<string, string> = {
  explain: 'Explain this lesson topic clearly for a diploma engineering student. Cover the core idea, why it matters, how it works step by step, and one worked example. Use clean Markdown headings: "Meaning", "How it works", "Example", "Quick recap".',
  simplify: 'Simplify this lesson topic into the easiest possible explanation. Use a real-life analogy first, then explain the technical version in 3 short bullet points.',
  hinglish: 'Explain this lesson in natural Hinglish. Keep technical keywords in English, use simple Hindi for the explanation.',
  marathi: 'Explain this lesson in clear, natural Marathi suitable for a diploma student. Keep standard technical terms in English where translation would reduce clarity.',
  eli10: 'Explain this lesson topic to a 10-year-old. Use a fun analogy, simple words, and short sentences. No jargon.',
  eli5: 'Explain this lesson topic to a 5-year-old. Use only everyday words and a single analogy. Maximum 4 sentences.',
  examples: 'Give three fully worked examples for this lesson topic, ranging from easy to exam-level.',
  coding_exercise: 'Create one coding exercise based on this lesson. Provide the problem statement, sample input, expected output, and a hint. Then provide a reference solution with explanation.',
  quiz: 'Create 5 multiple-choice questions based on this lesson. Each question must have exactly 4 options. After all questions, list the correct answers with one-line explanations.',
  flashcards: 'Create 6 flashcards in this exact format:\n\n**Card 1**\nQ: <question>\nA: <short answer>\n\nRepeat for cards 2-6.',
  summary: 'Summarise this lesson into a compact one-page revision note. Include: one-line definition, key points (5 bullets), important formulas or syntax, one common mistake to avoid, and a 3-word memory hook.',
  ask: 'Answer the student\'s question about this lesson clearly and concisely. Use Markdown.',
}

function buildSystemPrompt(action: string, ctx: { subjectName?: string; lessonTitle?: string; lessonOverview?: string; selection?: string; question?: string }): string {
  const bits: string[] = []
  if (ctx.subjectName) bits.push(`Subject: ${ctx.subjectName}`)
  if (ctx.lessonTitle) bits.push(`Lesson: ${ctx.lessonTitle}`)
  if (ctx.lessonOverview) bits.push(`Lesson overview:\n${ctx.lessonOverview}`)
  if (ctx.selection) bits.push(`Selected text:\n"""\n${ctx.selection}\n"""`)
  if (ctx.question) bits.push(`Student question: ${ctx.question}`)
  const contextBlock = bits.length > 0 ? bits.join('\n\n') : 'No specific lesson context provided.'
  return `You are LEO, Lernio's AI tutor embedded inside the interactive notes reader.\n\nLesson context:\n${contextBlock}\n\nAction requested: ${ACTION_PROMPTS[action] ?? ACTION_PROMPTS.explain}\n\nRules:\n- Be accurate, friendly, and concise.\n- Use clean Markdown.\n- Do not say "as an AI" or mention internal tools.\n- Match the depth to a diploma engineering student.`
}

const encoder = new TextEncoder()

export async function POST(req: NextRequest) {
  return withApi(async () => {
    const user = await requireUser()
    const json = await req.json().catch(() => ({}))
    const parsed = notesAiSchema.safeParse(json)
    if (!parsed.success) throw new ApiError('BAD_REQUEST', JSON.stringify(parsed.error.flatten()), 400, true)
    const body = parsed.data

    const limiter = await checkRateLimit({ action: 'ai_notes_action', identifier: user.id, limit: 80, windowMs: 60 * 60 * 1000 })
    if (!limiter.allowed) throw new ApiError('RATE_LIMITED', `Try again in ${limiter.retryAfterSec} seconds.`, 429, true)

    const systemPrompt = buildSystemPrompt(body.action, { subjectName: body.subjectName, lessonTitle: body.lessonTitle, lessonOverview: body.lessonOverview, selection: body.selection, question: body.question })
    const userMessage = body.question ? body.question : body.selection ? `Focus on the selected text and ${body.action} it.` : `Please ${body.action} this lesson now.`
    const requestId = crypto.randomUUID()
    const startedAt = Date.now()

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let content = ''
        let firstTokenAt: number | null = null
        const push = (event: any) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
        push({ type: 'meta', requestId, startedAt })
        try {
          for await (const token of streamGroqChat({ systemPrompt, messages: [{ role: 'user', content: userMessage }], maxTokens: 1400, profile: 'fast' })) {
            if (firstTokenAt === null) firstTokenAt = Date.now()
            content += token
            push({ type: 'delta', delta: token, requestId })
          }
          push({ type: 'done', requestId, content, startedAt, finishedAt: Date.now(), firstTokenAt })
        } catch (err) {
          const message = err instanceof GroqStreamError ? err.message : err instanceof Error ? err.message : 'AI request failed'
          push({ type: 'error', message, requestId })
        } finally { controller.close() }
      },
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'X-Content-Type-Options': 'nosniff' },
    })
  })
}

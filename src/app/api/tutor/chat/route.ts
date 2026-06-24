import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'
import { requireUser, withApi, okResponse, ApiError } from '@/lib/auth'
import { parseBody, tutorChatSchema } from '@/lib/schemas'
import { awardXp } from '@/lib/xp'
import {
  retrieveLessonContext,
  chunksToCitations,
  chunksToContextBlock,
} from '@/lib/ai/retrieval'
import type { Citation } from '@/lib/ai/provider'

interface ChatBody {
  sessionId: string
  message: string
  mode: string
  subjectName?: string
  unitTitle?: string
  topicTitle?: string
}

const MODE_PROMPTS: Record<string, string> = {
  explain_simple: 'Explain this concept in simple, clear English that a diploma student can understand. Use short paragraphs, bullet points, and real-world analogies. Avoid jargon where possible.',
  explain_deep: 'Provide an in-depth, thorough explanation of this concept. Cover the theory, mathematical foundations, edge cases, and advanced considerations. Structure with clear headings.',
  hinglish: 'Explain this concept in Hinglish (a natural mix of Hindi and English, written in Roman script). Use Hindi for conversational tone and English for technical terms. Example: "Array ek data structure hai jisme elements contiguous memory me store hote hain."',
  marathi: 'Explain this concept in Marathi (मराठी). Use clear, educational Marathi. Technical terms can remain in English.',
  exam_answer: 'Write an exam-ready answer. Structure it as: Definition (2 marks) → Explanation (with diagram description) → Example → Key points. Keep it concise and scoring-oriented for a diploma exam.',
  short_notes: 'Provide crisp short notes in bullet-point form. Include: definition, key formula/points, one example, common exam question. Keep each point to 1-2 lines.',
  create_mcqs: 'Generate 5 multiple-choice questions on this topic. For each: write the question, 4 options labeled A-D, the correct answer, and a one-line explanation. Vary difficulty from easy to hard.',
  ask_me: 'Act as an examiner. Ask the student ONE question about this topic at a time. Wait for their answer, then give brief feedback and ask the next question. Adjust difficulty based on their responses.',
  conduct_viva: 'Conduct a viva (oral examination). Ask one viva-style question at a time. These should be quick conceptual questions like "What is the difference between X and Y?" or "Why do we use X?". Wait for the answer before asking the next.',
  hint_only: 'Provide ONLY a hint that guides the student toward the answer without revealing it. Do NOT give the full answer. Ask a guiding question or point to a specific concept they should consider.',
  check_answer: 'Evaluate the student answer. Give: (1) Score out of 10, (2) Correct points they made, (3) Missing points, (4) Any incorrect claims, (5) An improved sample answer. Be constructive.',
  debug_code: 'Analyze the provided C++ code. Identify: (1) Syntax errors with line references, (2) Logical errors, (3) Potential improvements. Do NOT rewrite the entire code — point out issues and suggest fixes. Explain each issue clearly.',
  compare_concepts: 'Compare the two concepts. Create a comparison table with rows for: Definition, Key Features, Advantages, Disadvantages, Use Cases, Time/Space Complexity (if applicable). Then give a one-line summary of when to use each.',
  generate_flashcards: 'Generate 6 flashcards on this topic. Format each as: **Front:** [question/term] | **Back:** [concise answer/definition]. Cover the most important exam-relevant points.',
  build_study_plan: 'Create a study plan for this topic. Include: (1) Day-by-day breakdown, (2) Time allocation per sub-topic, (3) Practice questions to solve, (4) Revision checkpoints. Adapt to a diploma student preparing for exams.',
  review_weak_topics: 'Focus on common mistakes and misconceptions students have about this topic. List: (1) Top 5 common errors, (2) Why students make them, (3) How to avoid them, (4) Practice questions targeting these weak points.',
  summarise_material: 'Summarise the provided material into: (1) Key takeaways (3-5 bullets), (2) Important definitions, (3) Formulas or algorithms, (4) Likely exam questions. Keep it concise.',
}

export async function POST(req: NextRequest) {
  return withApi(async () => {
    const user = await requireUser()
    const body = await parseBody(req, tutorChatSchema)

    const { sessionId, message, mode, subjectName, unitTitle, topicTitle } =
      body as ChatBody

    // Ownership enforced at the query.
    const session = await db.tutorSession.findUnique({
      where: { id: sessionId, userId: user.id },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } },
    })
    if (!session) {
      throw new ApiError('NOT_FOUND', 'Session not found.', 404, false)
    }

    // Save user message
    await db.tutorMessage.create({ data: { sessionId, role: 'user', content: message, mode } })

    // --- REAL RETRIEVAL GROUNDING (DEBUG-1 fix) ---
    // Pull actual published/verified Lesson rows from the DB and expand them
    // into citable chunks. This replaces the previous "fake citation" pattern
    // where citations were fabricated from UI context strings.
    const chunks = await retrieveLessonContext({ subjectName, unitTitle, topicTitle })
    const contextBlock = chunksToContextBlock(chunks)
    const citations: Citation[] = chunksToCitations(chunks)

    // Light UI context (kept for tone, not for grounding claims).
    const contextParts: string[] = []
    if (subjectName) contextParts.push(`Subject: ${subjectName}`)
    if (unitTitle) contextParts.push(`Unit: ${unitTitle}`)
    if (topicTitle) contextParts.push(`Topic: ${topicTitle}`)
    const contextStr = contextParts.length ? `Academic context: ${contextParts.join(', ')}.\n` : ''

    const modeInstruction = MODE_PROMPTS[mode] || MODE_PROMPTS.explain_simple

    const groundingInstruction = contextBlock
      ? `${contextBlock}\n\nWhen you use information from the context above, cite it as [n] where n is the bracketed number. Only cite sources that genuinely support your answer. Do not fabricate sources.`
      : 'No verified lesson content was retrieved for this query. Answer from general knowledge and clearly state that the answer is not grounded in course material.'

    const systemPrompt = `You are LEO, the AI learning companion for Lernio AI 2.0 — an adaptive learning platform for diploma engineering students at Cusrow Wadia Institute of Technology (CWIT), Pune. You are friendly, encouraging, concise, and never condescending.

${contextStr}

${groundingInstruction}

INSTRUCTIONS FOR THIS RESPONSE MODE:
${modeInstruction}

GENERAL RULES:
- Always be academically accurate. If you are unsure, say so honestly.
- Use Markdown formatting (headings, bold, lists, code blocks) for readability.
- Keep explanations focused and exam-relevant.
- If the student asks something outside the academic context, gently redirect.
- Never invent syllabus topics or fake citations.
- Cite the topic/lesson when you reference specific course material.

Respond helpfully and concisely.`

    // Build messages for the LLM
    type ChatRole = 'user' | 'assistant'
    type ChatMessage = { role: ChatRole; content: string }
    const messages: ChatMessage[] = [
      { role: 'assistant', content: systemPrompt },
      ...session.messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-10)
        .map((m): ChatMessage => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
      { role: 'user', content: message },
    ]

    let assistantContent = ''
    // Evidence-based grounding: only 'grounded' when real lesson chunks were
    // retrieved and provided to the LLM. 'general' otherwise (never infer
    // grounding from the presence of a subject/topic name string).
    let groundingStatus = chunks.length > 0 ? 'grounded' : 'general'
    let usedFallback = false

    try {
      const zai = await ZAI.create()
      const completion = await zai.chat.completions.create({
        messages,
        thinking: { type: 'disabled' },
      })
      assistantContent = completion.choices[0]?.message?.content || ''
    } catch (err) {
      // Log the real error server-side only; never leak provider internals.
      console.error('[tutor/chat] LLM provider error:', err)
      usedFallback = true
      assistantContent = `I couldn't connect to my learning engine just now. Your message has been saved — please try again in a moment, and I'll give you a fully grounded answer${topicTitle ? ` on **${topicTitle}**` : ''}.`
      groundingStatus = 'general'
    }

    // Generate follow-up suggestions
    const followUps: string[] = [
      `Can you give an example of ${topicTitle || 'this'}?`,
      `What are common exam questions on this?`,
      `Explain this in simpler terms`,
    ]

    // Save assistant message — citations now come from REAL retrieved lesson
    // chunks (with genuine sourceId = Lesson.id), or null when ungrounded.
    const saved = await db.tutorMessage.create({
      data: {
        sessionId,
        role: 'assistant',
        content: assistantContent,
        mode,
        groundingStatus,
        citations: citations.length > 0 ? JSON.stringify(citations) : null,
        followUps: JSON.stringify(followUps),
      },
    })

    // Update session
    await db.tutorSession.update({ where: { id: sessionId }, data: { mode, updatedAt: new Date() } })

    // Award XP for tutor interaction via the idempotent ledger.
    await awardXp({
      userId: user.id,
      eventType: 'lesson_complete', // reuse a generic learning-touch event type
      amount: 5,
      idempotencyKey: `tutor_message:${saved.id}`,
      sourceId: saved.id,
    })

    return okResponse({
      message: saved,
      fallback: usedFallback,
    })
  })
}

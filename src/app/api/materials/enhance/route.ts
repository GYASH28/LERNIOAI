import { NextRequest, NextResponse } from 'next/server'
import { requireUser, withApi, okResponse, ApiError } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { getGeminiProvider } from '@/lib/ai/gemini-provider'
import { getAiProvider } from '@/lib/ai/provider'
import { getSubjectNotes, findLessonBySlug } from '@/lib/curriculum/lesson-notes-loader'

export const runtime = 'nodejs'
export const maxDuration = 60

interface EnhanceBody {
  subjectCode: string
  lessonSlug: string
}

const ENHANCEMENT_PROMPT = `You are an expert engineering textbook writer for diploma students. Your task is to expand a lesson into comprehensive, textbook-quality notes.

Requirements for the enhanced notes:
1. **Overview** — 2-3 paragraphs explaining what the topic is and why it matters
2. **Learning Objectives** — 4-5 bullet points of what the student will learn
3. **Detailed Theory** — 1500-3000 words covering:
   - Introduction and background
   - Core concepts with clear definitions
   - Step-by-step explanations
   - Working principles
   - Real-world examples (Indian engineering context)
   - Industrial applications
4. **Key Formulas** — All relevant formulas with symbol definitions
5. **Code Examples** — If applicable, runnable code with explanations
6. **Comparison Tables** — Where concepts need comparison
7. **Common Mistakes** — 3-5 mistakes students make
8. **Worked Examples** — 2-3 solved problems with steps
9. **Viva Questions** — 3-4 questions with model answers
10. **Exam Tips** — 3-5 tips for exam preparation
11. **Revision Summary** — 1-paragraph quick revision
12. **Flashcards** — 6-8 Q/A pairs for active recall

Format as JSON with the same structure as the existing lesson object. Use Markdown for theory content.

IMPORTANT:
- Write REAL educational content, not filler or placeholders
- Use accurate technical information
- Include actual numbers, formulas, and examples
- Make it detailed enough that a student can study from it alone`

export async function POST(req: NextRequest) {
  return withApi(async () => {
    const user = await requireUser()

    // Rate limit: 5 enhancements per hour per user
    const limiter = await checkRateLimit({
      key: `enhance:${user.id}`,
      limit: 5,
      windowMs: 60 * 60 * 1000,
    })
    if (!limiter.allowed) {
      throw new ApiError(
        'RATE_LIMITED',
        `You have reached the note enhancement limit. Try again in ${limiter.retryAfterSec} seconds.`,
        429,
        true,
      )
    }

    const body = (await req.json()) as EnhanceBody
    const { subjectCode, lessonSlug } = body

    if (!subjectCode || !lessonSlug) {
      throw new ApiError('BAD_REQUEST', 'subjectCode and lessonSlug are required', 400, false)
    }

    // Load existing lesson
    const subjectNotes = getSubjectNotes(subjectCode)
    if (!subjectNotes) {
      throw new ApiError('NOT_FOUND', `Subject ${subjectCode} not found`, 404, false)
    }

    const match = findLessonBySlug(subjectCode, lessonSlug)
    if (!match) {
      throw new ApiError('NOT_FOUND', `Lesson ${lessonSlug} not found`, 404, false)
    }

    const { lesson, subject } = match

    // Build context for the AI
    const lessonContext = {
      subjectCode: subject.subjectCode,
      subjectName: subject.subjectName,
      lessonTitle: lesson.title,
      currentOverview: lesson.overview,
      currentTheory: lesson.theory?.substring(0, 500) + '...',
      currentKeyConcepts: lesson.keyConcepts,
      currentFlashcards: lesson.flashcards?.map(f => ({ front: f.front, back: f.back })),
      currentPracticeQuestions: lesson.practiceQuestions?.length || 0,
    }

    // Try Gemini first (1M context, better for long-form generation), fall back to Groq
    let enhancedContent: string
    try {
      const gemini = getGeminiProvider()
      if (gemini.isConfigured()) {
        const response = await gemini.chat({
          systemPrompt: ENHANCEMENT_PROMPT,
          messages: [{
            role: 'user',
            content: `Enhance this lesson to textbook quality:\n\n${JSON.stringify(lessonContext, null, 2)}\n\nGenerate complete, detailed notes following the structure above. Return ONLY the enhanced theory as Markdown text (not JSON).`,
          }],
          maxTokens: 4000,
        })
        enhancedContent = response.content
      } else {
        throw new Error('Gemini not configured')
      }
    } catch {
      // Fall back to Groq
      const provider = getAiProvider()
      const response = await provider.chat({
        systemPrompt: ENHANCEMENT_PROMPT,
        messages: [{
          role: 'user',
          content: `Enhance this lesson to textbook quality:\n\n${JSON.stringify(lessonContext, null, 2)}\n\nGenerate complete, detailed notes following the structure above. Return ONLY the enhanced theory as Markdown text (not JSON).`,
        }],
        maxTokens: 4000,
      })
      enhancedContent = response.content
    }

    return okResponse({
      enhanced: true,
      lessonSlug,
      subjectCode,
      enhancedTheory: enhancedContent,
      originalLength: lesson.theory?.length || 0,
      enhancedLength: enhancedContent.length,
      message: 'Notes enhanced successfully',
    })
  })
}

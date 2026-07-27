import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface SubjectInput {
  code: string
  name: string
  credits: number
  coverageFocus: string
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/**
 * AI-powered study plan generator.
 * Uses Groq to generate a personalized weekly study plan based on
 * the student's subjects, credits, and coverage focus.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const subjects: SubjectInput[] = body.subjects || []

    if (!subjects.length) {
      return NextResponse.json({ ok: false, error: 'No subjects provided' }, { status: 400 })
    }

    // Try AI generation with Groq
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      // Fallback: generate a simple plan without AI
      return NextResponse.json({ ok: true, tasks: generateFallbackPlan(subjects) })
    }

    const subjectList = subjects.map(s =>
      `- ${s.code}: ${s.name} (${s.credits} credits) — ${s.coverageFocus}`
    ).join('\n')

    const prompt = `You are a study planner for diploma engineering students. Create a weekly study plan (Monday to Sunday) for these subjects:

${subjectList}

Generate a JSON array of study tasks. Each task must have:
- "title": specific study activity (e.g., "Watch: Arrays lecture", "Practice: Linked list quiz", "Revise: Sorting algorithms")
- "subject": subject code
- "day": one of ${DAYS.join(', ')}
- "priority": 1-5 (5=highest)

Rules:
- 2-3 tasks per subject
- Spread tasks across different days
- Mix of activities: watch lectures, practice quizzes, revision, coding practice
- Higher credit subjects get higher priority
- Return ONLY the JSON array, no markdown

Example format:
[{"title":"Watch: Data Structures Arrays","subject":"R23CP2402","day":"Monday","priority":4}]`

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.GROQ_FAST_MODEL || 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'You are a helpful study planner. Return only valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!groqResponse.ok) {
      return NextResponse.json({ ok: true, tasks: generateFallbackPlan(subjects) })
    }

    const groqData = await groqResponse.json()
    const content = groqData.choices?.[0]?.message?.content || ''

    // Parse the AI response — extract JSON array
    let tasks: any[] = []
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      const jsonStr = jsonMatch ? jsonMatch[0] : content
      tasks = JSON.parse(jsonStr)
    } catch {
      // If parsing fails, use fallback
      return NextResponse.json({ ok: true, tasks: generateFallbackPlan(subjects) })
    }

    // Validate and format tasks
    const validTasks = tasks
      .filter(t => t.title && t.subject && t.day)
      .map((t, i) => ({
        id: `ai-${Date.now()}-${i}`,
        title: String(t.title).slice(0, 200),
        subject: String(t.subject),
        date: DAYS.includes(t.day) ? t.day : DAYS[i % 7],
        priority: Math.min(Math.max(Number(t.priority) || 3, 1), 5),
        completed: false,
      }))

    if (!validTasks.length) {
      return NextResponse.json({ ok: true, tasks: generateFallbackPlan(subjects) })
    }

    return NextResponse.json({ ok: true, tasks: validTasks })
  } catch {
    return NextResponse.json({ ok: true, tasks: [] })
  }
}

function generateFallbackPlan(subjects: SubjectInput[]) {
  const tasks: any[] = []
  subjects.slice(0, 7).forEach((s, i) => {
    tasks.push({
      id: `auto-${Date.now()}-${i}`,
      title: `Study: ${s.name} — watch primary lecture`,
      subject: s.code,
      date: DAYS[i % 7],
      priority: s.credits >= 5 ? 4 : 2,
      completed: false,
    })
    tasks.push({
      id: `auto-${Date.now()}-${i}-quiz`,
      title: `Practice quiz: ${s.name}`,
      subject: s.code,
      date: DAYS[(i + 3) % 7],
      priority: 3,
      completed: false,
    })
  })
  return tasks
}

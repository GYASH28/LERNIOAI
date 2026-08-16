import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { recordPracticeAnswer } from '@/lib/academics/practice-store'

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (typeof body.questionId !== 'string' || !body.questionId) {
    return NextResponse.json({ error: 'Question is required.' }, { status: 400 })
  }

  try {
    const result = await recordPracticeAnswer({
      userId: user.id,
      questionId: body.questionId,
      selectedAnswer: body.selectedAnswer,
      timeTakenSeconds: typeof body.timeTakenSeconds === 'number' ? body.timeTakenSeconds : undefined,
      practiceMode: typeof body.practiceMode === 'string' ? body.practiceMode : undefined,
    })
    if (!result) return NextResponse.json({ error: 'Question not found.' }, { status: 404 })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Practice answer failed', error)
    return NextResponse.json({ error: 'Could not save this answer. Please try again.' }, { status: 500 })
  }
}

import { NextRequest } from 'next/server'
import { getSubjectNotes } from '@/lib/curriculum/lesson-notes-loader'
import { withApi, okResponse, ApiError, getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export function GET(request: NextRequest) {
  return withApi(async () => {
    await getCurrentUser()
    const url = new URL(request.url)
    const subjectCode = url.searchParams.get('subject')
    const count = Math.min(parseInt(url.searchParams.get('count') ?? '5'), 20)
    if (!subjectCode) throw new ApiError('BAD_REQUEST', 'Missing subject', 400, false)
    const notes = getSubjectNotes(subjectCode)
    if (!notes) throw new ApiError('NOT_FOUND', 'No notes for this subject', 404, false)
    const allQs: any[] = []
    for (const u of notes.units) for (const l of u.lessons) for (const q of l.practiceQuestions) allQs.push({ ...q, lessonTitle: l.title })
    const shuffled = allQs.sort(() => Math.random() - 0.5).slice(0, count)
    return okResponse({ subject: notes.subjectName, totalAvailable: allQs.length, questions: shuffled })
  })
}

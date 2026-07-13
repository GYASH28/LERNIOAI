import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** PATCH /api/class/polls/[id] — close/reopen a poll (creator or mod) */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { id } = await params
    const body = await req.json().catch(() => ({}))

    const poll = await db.classAnnouncement.findUnique({
      where: { id },
      select: { id: true, classId: true, authorId: true, body: true },
    })
    if (!poll) return NextResponse.json({ error: 'Poll not found' }, { status: 404 })

    // Parse current poll data
    let pollData: any = { options: [], votes: {}, multipleChoice: false, deadline: null }
    try { pollData = JSON.parse(poll.body) } catch {}

    // Close poll by setting deadline to now
    if (body.close === true) {
      pollData.deadline = new Date().toISOString()
    } else if (body.close === false) {
      pollData.deadline = null
    }

    await db.classAnnouncement.update({
      where: { id },
      data: { body: JSON.stringify(pollData) },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[poll PATCH]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/** DELETE /api/class/polls/[id] — delete poll (creator or mod) */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { id } = await params
    const poll = await db.classAnnouncement.findUnique({
      where: { id },
      select: { id: true, authorId: true },
    })
    if (!poll) return NextResponse.json({ error: 'Poll not found' }, { status: 404 })

    // Archive (soft delete)
    await db.classAnnouncement.update({
      where: { id },
      data: { archivedAt: new Date() },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[poll DELETE]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

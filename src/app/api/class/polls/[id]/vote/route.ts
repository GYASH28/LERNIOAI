import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** POST /api/class/polls/[id]/vote — toggle vote on an option */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { id: pollId } = await params
    const body = await req.json().catch(() => null)
    if (body === null || typeof body.optionIndex !== 'number') {
      return NextResponse.json({ error: 'optionIndex required' }, { status: 400 })
    }

    const poll = await db.classAnnouncement.findUnique({
      where: { id: pollId },
      include: { class: { select: { id: true, departmentCode: true } } },
    })
    if (!poll) return NextResponse.json({ error: 'Poll not found' }, { status: 404 })

    // Parse poll data
    let pollData: any = { options: [], votes: {}, multipleChoice: false, deadline: null }
    try { pollData = JSON.parse(poll.body) } catch {}

    const options: string[] = pollData.options || []
    if (body.optionIndex < 0 || body.optionIndex >= options.length) {
      return NextResponse.json({ error: 'Invalid option' }, { status: 400 })
    }

    // Check if poll is open
    const now = new Date()
    if (pollData.deadline && new Date(pollData.deadline) < now) {
      return NextResponse.json({ error: 'Poll is closed' }, { status: 400 })
    }

    // Authz: class member or same-dept staff
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { role: true, departmentCode: true },
    })
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const isStaff = ['admin', 'coordinator', 'teacher'].includes(dbUser.role)
    if (!isStaff) {
      const m = await db.classMember.findUnique({
        where: { classId_userId: { classId: poll.class.id, userId: user.id } },
        select: { id: true },
      })
      if (!m) return NextResponse.json({ error: 'Not a class member' }, { status: 403 })
    }

    const votes: Record<number, string[]> = pollData.votes || {}
    const optionIndex = body.optionIndex as number

    // Check existing vote
    const existingVotes = Object.entries(votes).filter(([, uids]) => uids.includes(user.id)).map(([i]) => Number(i))

    // Toggle: if already voted for this option, remove the vote
    if (existingVotes.includes(optionIndex)) {
      votes[optionIndex] = (votes[optionIndex] || []).filter((uid: string) => uid !== user.id)
    } else {
      // If single-choice, remove all previous votes
      if (!pollData.multipleChoice) {
        for (const idx of existingVotes) {
          votes[idx] = (votes[idx] || []).filter((uid: string) => uid !== user.id)
        }
      }
      // Add new vote
      votes[optionIndex] = [...(votes[optionIndex] || []), user.id]
    }

    pollData.votes = votes

    await db.classAnnouncement.update({
      where: { id: pollId },
      data: { body: JSON.stringify(pollData) },
    })

    return NextResponse.json({ ok: true, action: existingVotes.includes(optionIndex) ? 'removed' : 'added' })
  } catch (err) {
    console.error('[poll vote POST]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

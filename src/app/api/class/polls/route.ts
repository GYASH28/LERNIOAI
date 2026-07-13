import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { canModerateClass, ensureMyClass } from '@/lib/class'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** GET /api/class/polls — list polls for caller's class */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const url = new URL(req.url)
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { role: true, departmentCode: true, semesterNumber: true, division: true },
    })
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    let classId = url.searchParams.get('classId')
    let classRecord = null
    if (classId) {
      classRecord = await db.class.findUnique({ where: { id: classId }, select: { id: true, departmentCode: true } })
    } else {
      classRecord = await ensureMyClass(dbUser)
    }
    if (!classRecord) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

    // Authz
    const isStaff = ['admin', 'coordinator', 'teacher'].includes(dbUser.role)
    if (isStaff) {
      if (dbUser.departmentCode && dbUser.departmentCode !== classRecord.departmentCode) {
        return NextResponse.json({ error: 'Not in this department' }, { status: 403 })
      }
    } else {
      const m = await db.classMember.findUnique({
        where: { classId_userId: { classId: classRecord.id, userId: user.id } },
        select: { id: true },
      })
      if (!m) return NextResponse.json({ error: 'Not a class member' }, { status: 403 })
    }

    // We store polls as ClassAnnouncement with title="POLL:<question>" and body=JSON of options
    // This avoids needing a new table
    const pollAnnouncements = await db.classAnnouncement.findMany({
      where: { classId: classRecord.id, title: { startsWith: 'POLL:' }, archivedAt: null },
      include: { author: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    // Parse polls
    const polls = pollAnnouncements.map((a) => {
      try {
        const question = a.title.replace('POLL:', '').trim()
        const data = JSON.parse(a.body)
        const options: string[] = data.options || []
        const votes: Record<number, string[]> = data.votes || {} // optionIndex -> userIds
        const multipleChoice = data.multipleChoice || false
        const deadline = data.deadline || null

        // Compute tally + check if current user voted
        const tally = options.map((_, i) => (votes[i] || []).length)
        const totalVotes = tally.reduce((s, n) => s + n, 0)
        const myVotes = Object.entries(votes).filter(([, uids]) => uids.includes(user.id)).map(([i]) => Number(i))
        const now = new Date()
        const open = !deadline || new Date(deadline) > now

        return {
          id: a.id,
          question,
          options,
          tally,
          totalVotes,
          myVotes,
          open,
          multipleChoice,
          deadline,
          createdBy: a.author,
          createdAt: a.createdAt,
        }
      } catch {
        return null
      }
    }).filter(Boolean)

    return NextResponse.json({ ok: true, data: polls })
  } catch (err) {
    console.error('[polls GET]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/** POST /api/class/polls — create a poll (moderators only) */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await req.json().catch(() => null)
    if (!body || typeof body.question !== 'string' || !Array.isArray(body.options)) {
      return NextResponse.json({ error: 'question and options required' }, { status: 400 })
    }

    const question = body.question.trim().slice(0, 300)
    const options = (body.options as any[]).map((o) => String(o).trim()).filter(Boolean).slice(0, 6)
    if (!question || options.length < 2) {
      return NextResponse.json({ error: 'Need a question and at least 2 options' }, { status: 400 })
    }

    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { role: true, departmentCode: true, semesterNumber: true, division: true },
    })
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    let classRecord = null
    if (body.classId) {
      classRecord = await db.class.findUnique({ where: { id: body.classId }, select: { id: true, departmentCode: true, crId: true } })
    } else {
      classRecord = await ensureMyClass(dbUser)
    }
    if (!classRecord) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

    if (!canModerateClass(dbUser, classRecord)) {
      return NextResponse.json({ error: 'Not authorized to create polls' }, { status: 403 })
    }

    // Store as ClassAnnouncement with POLL: prefix
    const pollData = JSON.stringify({
      options,
      votes: {}, // optionIndex -> userIds
      multipleChoice: Boolean(body.multipleChoice),
      deadline: body.deadline || null,
    })

    const created = await db.classAnnouncement.create({
      data: {
        classId: classRecord.id,
        authorId: user.id,
        title: `POLL: ${question}`,
        body: pollData,
      },
    })

    return NextResponse.json({ ok: true, data: { id: created.id, question, options } })
  } catch (err) {
    console.error('[polls POST]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

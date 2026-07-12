import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { ensureMyClass, canModerateClass } from '@/lib/class'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** GET /api/class/announcements — list for caller's class */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const url = new URL(req.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '30', 10) || 30, 100)

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

    // Authz: same-dept staff OR class member
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

    const now = new Date()
    const announcements = await db.classAnnouncement.findMany({
      where: { classId: classRecord.id, archivedAt: null },
      include: { author: { select: { id: true, name: true, role: true } } },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    })

    const visible = announcements.map((a) => ({
      ...a,
      pinned: a.pinned && (!a.pinnedUntil || a.pinnedUntil > now),
    }))

    return NextResponse.json({ ok: true, data: visible })
  } catch (err) {
    console.error('[announcements GET]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/** POST /api/class/announcements — create (moderators only) */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await req.json().catch(() => null)
    if (!body || typeof body.title !== 'string' || typeof body.body !== 'string') {
      return NextResponse.json({ error: 'title and body required' }, { status: 400 })
    }

    const title = body.title.trim().slice(0, 200)
    const bodyText = body.body.trim().slice(0, 4000)
    if (!title || !bodyText) return NextResponse.json({ error: 'Empty title or body' }, { status: 400 })

    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { role: true, departmentCode: true, semesterNumber: true, division: true },
    })
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    let classRecord = null
    if (body.classId) {
      classRecord = await db.class.findUnique({
        where: { id: body.classId },
        select: { id: true, departmentCode: true, crId: true },
      })
    } else {
      classRecord = await ensureMyClass(dbUser)
    }
    if (!classRecord) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

    if (!canModerateClass(dbUser, classRecord)) {
      return NextResponse.json({ error: 'Not authorized to post' }, { status: 403 })
    }

    const pinned = Boolean(body.pinned)
    let pinnedUntil: Date | null = null
    if (pinned) {
      pinnedUntil = body.pinnedUntil ? new Date(body.pinnedUntil) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      if (isNaN(pinnedUntil.getTime())) pinnedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }

    const created = await db.classAnnouncement.create({
      data: { classId: classRecord.id, authorId: user.id, title, body: bodyText, pinned, pinnedUntil },
      include: { author: { select: { id: true, name: true, role: true } } },
    })
    return NextResponse.json({ ok: true, data: created })
  } catch (err) {
    console.error('[announcements POST]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

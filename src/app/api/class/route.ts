import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { ensureMyClass, canModerateClass } from '@/lib/class'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/class?action=my-class
 *   Returns the caller's class with members + CR + recent announcements + today's timetable.
 * GET /api/class?action=teacher-classes
 *   Returns classes grouped by semester (for teachers/coordinators/admins).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'my-class'

    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: {
        role: true,
        departmentCode: true,
        semesterNumber: true,
        division: true,
        name: true,
        email: true,
        rollNumber: true,
      },
    })
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    if (action === 'teacher-classes') {
      if (!['teacher', 'admin', 'coordinator'].includes(dbUser.role)) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
      }
      const dept = dbUser.departmentCode || 'DCOMP'
      const classes = await db.class.findMany({
        where: { departmentCode: dept },
        include: {
          cr: { select: { id: true, name: true, email: true } },
          _count: { select: { members: true } },
        },
        orderBy: [{ semesterNumber: 'asc' }, { division: 'asc' }],
      })
      const bySemester: Record<number, any[]> = {}
      for (let s = 1; s <= 6; s++) {
        bySemester[s] = classes.filter((c) => c.semesterNumber === s)
      }
      return NextResponse.json({ ok: true, data: bySemester })
    }

    // Default: my-class
    const classRecord = await ensureMyClass(dbUser)
    if (!classRecord) return NextResponse.json({ error: 'No class found' }, { status: 400 })

    // Auto-add user as member
    const existingMembership = await db.classMember.findUnique({
      where: { classId_userId: { classId: classRecord.id, userId: user.id } },
      select: { id: true },
    })
    if (!existingMembership) {
      try {
        await db.classMember.create({ data: { classId: classRecord.id, userId: user.id } })
      } catch {}
    }

    // If user is CR, auto-assign them as the class CR
    if (dbUser.role === 'cr' && classRecord.crId !== user.id) {
      try {
        await db.class.update({ where: { id: classRecord.id }, data: { crId: user.id } })
      } catch {}
    }

    // Fetch full class data
    const full = await db.class.findUnique({
      where: { id: classRecord.id },
      include: {
        cr: { select: { id: true, name: true, email: true, rollNumber: true } },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, rollNumber: true, xp: true, streak: true, role: true },
            },
          },
          orderBy: { user: { name: 'asc' } },
        },
      },
    })

    // Recent announcements (top 5)
    const announcements = await db.classAnnouncement.findMany({
      where: { classId: classRecord.id, archivedAt: null },
      include: { author: { select: { id: true, name: true, role: true } } },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      take: 5,
    })

    // Today's timetable
    const today = new Date().getDay()
    const todaySlots = await db.classTimetable.findMany({
      where: { classId: classRecord.id, dayOfWeek: today, isActive: true },
      orderBy: { periodIndex: 'asc' },
    })

    return NextResponse.json({
      ok: true,
      data: { ...full, announcements, todaySlots },
    })
  } catch (err) {
    console.error('[class API GET]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/**
 * PATCH /api/class
 * Body: { classId, alias?, avatarEmoji?, avatarColor? }
 * Updates class identity. Allowed for: admin, coordinator, teacher (same dept), CR (of class).
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await req.json().catch(() => null)
    if (!body?.classId) return NextResponse.json({ error: 'Missing classId' }, { status: 400 })

    const { classId, alias, avatarEmoji, avatarColor } = body

    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { role: true, departmentCode: true },
    })
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const existing = await db.class.findUnique({
      where: { id: classId },
      select: { id: true, departmentCode: true, crId: true },
    })
    if (!existing) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

    if (!canModerateClass(dbUser, existing)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const data: any = { aliasUpdatedBy: user.id, aliasUpdatedAt: new Date() }
    if (alias !== undefined) {
      const trimmed = (typeof alias === 'string' ? alias.trim() : '').slice(0, 60)
      data.alias = trimmed || null
    }
    if (avatarEmoji !== undefined) {
      const trimmed = (typeof avatarEmoji === 'string' ? avatarEmoji.trim() : '').slice(0, 8)
      data.avatarEmoji = trimmed || null
    }
    if (avatarColor !== undefined) {
      const trimmed = (typeof avatarColor === 'string' ? avatarColor.trim() : '').slice(0, 9)
      data.avatarColor = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed) ? trimmed.toLowerCase() : null
    }

    const updated = await db.class.update({
      where: { id: classId },
      data,
      include: {
        cr: { select: { id: true, name: true, email: true } },
        _count: { select: { members: true } },
      },
    })
    return NextResponse.json({ ok: true, data: updated })
  } catch (err) {
    console.error('[class API PATCH]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

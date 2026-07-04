import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { canModerateClass } from '@/lib/class'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** PATCH /api/class/announcements/[id] — edit (author or mod), pin/unpin, archive */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { id } = await params
    const body = await req.json().catch(() => ({}))

    const existing = await db.classAnnouncement.findUnique({
      where: { id },
      include: { class: { select: { id: true, departmentCode: true, crId: true } } },
    })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { role: true, departmentCode: true },
    })
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const isAuthor = existing.authorId === user.id
    const isMod = canModerateClass(dbUser, existing.class)
    if (!isAuthor && !isMod) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const data: any = {}
    if (typeof body.title === 'string') {
      const t = body.title.trim().slice(0, 200)
      if (t) data.title = t
    }
    if (typeof body.body === 'string') {
      const b = body.body.trim().slice(0, 4000)
      if (b) data.body = b
    }
    if (typeof body.pinned === 'boolean') {
      data.pinned = body.pinned
      data.pinnedUntil = body.pinned
        ? (body.pinnedUntil ? new Date(body.pinnedUntil) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
        : null
    }
    if (body.archived === true) data.archivedAt = new Date()

    const updated = await db.classAnnouncement.update({
      where: { id },
      data,
      include: { author: { select: { id: true, name: true, role: true } } },
    })
    return NextResponse.json({ ok: true, data: updated })
  } catch (err) {
    console.error('[announcements PATCH]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/** DELETE /api/class/announcements/[id] — hard-delete for admin, archive for others */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { id } = await params
    const existing = await db.classAnnouncement.findUnique({
      where: { id },
      include: { class: { select: { id: true, departmentCode: true, crId: true } } },
    })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { role: true, departmentCode: true },
    })
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const isAuthor = existing.authorId === user.id
    const isMod = canModerateClass(dbUser, existing.class)
    if (!isAuthor && !isMod) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    if (dbUser.role === 'admin') {
      await db.classAnnouncement.delete({ where: { id } })
    } else {
      await db.classAnnouncement.update({
        where: { id },
        data: { archivedAt: new Date(), pinned: false, pinnedUntil: null },
      })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[announcements DELETE]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

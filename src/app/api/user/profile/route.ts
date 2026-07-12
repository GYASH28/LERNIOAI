import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DEPARTMENTS = ['DCOMP', 'DCIOT']
const SEMESTERS = [1, 2, 3, 4, 5, 6]
const DIVISIONS = ['A', 'B', 'C']

/**
 * PATCH /api/user/profile
 * Body: { name?, rollNumber?, departmentCode?, semesterNumber?, division?, phone? }
 * Updates the current user's profile. If dept/sem/div changes, they'll be
 * auto-added to the new class on next /api/class call.
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

    const data: any = {}

    if (typeof body.name === 'string') {
      const trimmed = body.name.trim().slice(0, 100)
      if (trimmed) data.name = trimmed
    }
    if (typeof body.rollNumber === 'string') {
      data.rollNumber = body.rollNumber.trim().slice(0, 32) || null
    }
    if (typeof body.phone === 'string') {
      data.phone = body.phone.trim().slice(0, 20) || null
    }
    if (typeof body.departmentCode === 'string') {
      if (DEPARTMENTS.includes(body.departmentCode)) {
        data.departmentCode = body.departmentCode
        data.departmentName = body.departmentCode === 'DCOMP'
          ? 'Diploma in Computer Engineering'
          : 'Diploma in Computer Engineering & IoT'
      }
    }
    if (typeof body.semesterNumber === 'number') {
      if (SEMESTERS.includes(body.semesterNumber)) {
        data.semesterNumber = body.semesterNumber
      }
    }
    if (typeof body.division === 'string') {
      if (DIVISIONS.includes(body.division)) {
        data.division = body.division
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const updated = await db.user.update({
      where: { id: user.id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        rollNumber: true,
        phone: true,
        departmentCode: true,
        departmentName: true,
        semesterNumber: true,
        division: true,
        xp: true,
        streak: true,
        level: true,
      },
    })

    return NextResponse.json({ ok: true, data: updated })
  } catch (err) {
    console.error('[profile PATCH]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

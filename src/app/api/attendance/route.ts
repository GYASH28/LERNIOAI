import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/attendance
 * Query params:
 *   - action=list-sessions → list sessions for user's class
 *   - action=my-attendance → get current user's attendance records
 *   - action=session&id=xxx → get a specific session with all records
 *   - action=class-students → get students in CR's class for marking
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'list-sessions'

    // Get user's class info
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { departmentCode: true, semesterNumber: true, division: true, role: true },
    })

    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    if (action === 'my-attendance') {
      // Get current user's attendance records
      const records = await db.attendanceRecord.findMany({
        where: { userId: user.id },
        include: {
          session: {
            select: { date: true, subjectName: true, subjectCode: true, departmentCode: true, semesterNumber: true, division: true }
          }
        },
        orderBy: { session: { date: 'desc' } },
        take: 50,
      })

      const total = records.length
      const present = records.filter(r => r.status === 'present').length
      const absent = records.filter(r => r.status === 'absent').length
      const late = records.filter(r => r.status === 'late').length
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0

      return NextResponse.json({
        ok: true,
        data: {
          records: records.map(r => ({
            id: r.id,
            status: r.status,
            remark: r.remark,
            date: r.session.date,
            subjectName: r.session.subjectName,
            subjectCode: r.session.subjectCode,
          })),
          stats: { total, present, absent, late, percentage }
        }
      })
    }

    if (action === 'list-sessions') {
      const sessions = await db.attendanceSession.findMany({
        where: {
          departmentCode: dbUser.departmentCode || undefined,
          semesterNumber: dbUser.semesterNumber || undefined,
          division: dbUser.division || undefined,
        },
        orderBy: { date: 'desc' },
        take: 30,
        select: {
          id: true, date: true, subjectCode: true, subjectName: true,
          totalStudents: true, presentCount: true, absentCount: true,
          takenBy: { select: { name: true } },
        },
      })

      return NextResponse.json({ ok: true, data: sessions })
    }

    if (action === 'session') {
      const sessionId = url.searchParams.get('id')
      if (!sessionId) return NextResponse.json({ error: 'Missing session id' }, { status: 400 })

      const session = await db.attendanceSession.findUnique({
        where: { id: sessionId },
        include: {
          records: {
            include: {
              user: { select: { id: true, name: true, rollNumber: true, email: true } }
            },
            orderBy: { user: { name: 'asc' } }
          },
          takenBy: { select: { name: true } },
        },
      })

      if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

      return NextResponse.json({ ok: true, data: session })
    }

    if (action === 'class-students') {
      // CR or teacher gets list of students in their class
      if (dbUser.role !== 'cr' && dbUser.role !== 'teacher' && dbUser.role !== 'admin') {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
      }

      const students = await db.user.findMany({
        where: {
          role: 'student',
          status: 'active',
          departmentCode: dbUser.departmentCode || undefined,
          semesterNumber: dbUser.semesterNumber || undefined,
          division: dbUser.division || undefined,
        },
        select: { id: true, name: true, rollNumber: true, email: true },
        orderBy: [{ rollNumber: 'asc' }, { name: 'asc' }],
      })

      return NextResponse.json({ ok: true, data: students })
    }

    if (action === 'stats') {
      // Get attendance stats for CR/teacher dashboard
      if (dbUser.role !== 'cr' && dbUser.role !== 'teacher' && dbUser.role !== 'admin') {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
      }

      const sessions = await db.attendanceSession.findMany({
        where: {
          departmentCode: dbUser.departmentCode || undefined,
          semesterNumber: dbUser.semesterNumber || undefined,
          division: dbUser.division || undefined,
        },
        orderBy: { date: 'desc' },
        take: 30,
        select: { id: true, date: true, subjectName: true, totalStudents: true, presentCount: true, absentCount: true },
      })

      const totalSessions = sessions.length
      const totalPresent = sessions.reduce((sum, s) => sum + s.presentCount, 0)
      const totalAbsent = sessions.reduce((sum, s) => sum + s.absentCount, 0)
      const avgAttendance = totalSessions > 0 ? Math.round((totalPresent / (totalPresent + totalAbsent)) * 100) : 0

      return NextResponse.json({
        ok: true,
        data: {
          totalSessions,
          totalPresent,
          totalAbsent,
          avgAttendance,
          recentSessions: sessions.slice(0, 5),
        }
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('[attendance GET]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/**
 * POST /api/attendance
 * Body: { action: 'mark', subjectCode, subjectName, date, records: [{ userId, status, remark? }] }
 * CR or teacher marks attendance for their class
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { role: true, departmentCode: true, semesterNumber: true, division: true },
    })

    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Only CR, teacher, admin can mark attendance
    if (dbUser.role !== 'cr' && dbUser.role !== 'teacher' && dbUser.role !== 'admin') {
      return NextResponse.json({ error: 'Not authorized to take attendance' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const { subjectCode, subjectName, date, records, notes } = body

    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: 'No attendance records provided' }, { status: 400 })
    }

    // Create attendance session
    const session = await db.attendanceSession.create({
      data: {
        takenById: user.id,
        departmentCode: dbUser.departmentCode || 'DCOMP',
        semesterNumber: dbUser.semesterNumber || 3,
        division: dbUser.division || 'A',
        subjectCode: subjectCode || null,
        subjectName: subjectName || null,
        date: date ? new Date(date) : new Date(),
        totalStudents: records.length,
        presentCount: records.filter((r: any) => r.status === 'present').length,
        absentCount: records.filter((r: any) => r.status === 'absent').length,
        notes: notes || null,
        records: {
          create: records.map((r: any) => ({
            userId: r.userId,
            status: r.status,
            remark: r.remark || null,
          })),
        },
      },
      include: { records: true },
    })

    return NextResponse.json({ ok: true, data: { sessionId: session.id } })
  } catch (err) {
    console.error('[attendance POST]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

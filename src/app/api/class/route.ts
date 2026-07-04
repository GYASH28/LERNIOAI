import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/class
 * Query params:
 *   - action=my-class → get current user's class + classmates + CR
 *   - action=teacher-classes → get all classes for teacher's department
 *   - action=class&id=xxx → get specific class with members
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'my-class'

    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { role: true, departmentCode: true, semesterNumber: true, division: true, name: true, email: true, rollNumber: true, xp: true, streak: true },
    })

    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // teacher-classes action: admin/teacher can view all classes (even without dept/sem/div)
    // This MUST be checked BEFORE the profile-completion check below, because admins
    // typically don't have departmentCode/semesterNumber/division set.
    if (action === 'teacher-classes') {
      if (dbUser.role !== 'teacher' && dbUser.role !== 'admin' && dbUser.role !== 'coordinator') {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
      }

      // Admin sees ALL classes; teachers/coordinators see only their department
      const whereClause = dbUser.role === 'admin' ? {} : { departmentCode: dbUser.departmentCode || 'DCOMP' }

      const classes = await db.class.findMany({
        where: whereClause,
        include: {
          cr: { select: { id: true, name: true, email: true } },
          _count: { select: { members: true } }
        },
        orderBy: [{ departmentCode: 'asc' }, { semesterNumber: 'asc' }, { division: 'asc' }]
      })

      const bySemester: Record<number, any[]> = {}
      for (let s = 1; s <= 6; s++) {
        bySemester[s] = classes.filter(c => c.semesterNumber === s)
      }

      return NextResponse.json({ ok: true, data: bySemester })
    }

    // If user has no department/semester/division, return empty state instead of erroring
    // (but only for my-class action — teacher-classes is handled above)
    if (!dbUser.departmentCode || !dbUser.semesterNumber || !dbUser.division) {
      return NextResponse.json({
        ok: true,
        data: null,
        message: 'Please complete your profile with department, semester, and division to join a class.',
      })
    }

    if (action === 'my-class') {
      // Find or create the user's class
      const dept = dbUser.departmentCode || 'DCOMP'
      const sem = dbUser.semesterNumber || 3
      const div = dbUser.division || 'A'

      // Find class
      let classRecord = await db.class.findUnique({
        where: { departmentCode_semesterNumber_division: { departmentCode: dept, semesterNumber: sem, division: div } },
        include: {
          cr: { select: { id: true, name: true, email: true, rollNumber: true } },
          members: {
            include: {
              user: { select: { id: true, name: true, email: true, rollNumber: true, xp: true, streak: true, role: true } }
            },
            orderBy: [{ user: { rollNumber: "asc" } }, { user: { name: "asc" } }]
          }
        }
      })

      // Auto-create class if it doesn't exist
      if (!classRecord) {
        try {
          classRecord = await db.class.create({
            data: {
              departmentCode: dept,
              semesterNumber: sem,
              division: div,
              academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
            },
            include: {
              cr: { select: { id: true, name: true, email: true, rollNumber: true } },
              members: {
                include: {
                  user: { select: { id: true, name: true, email: true, rollNumber: true, xp: true, streak: true, role: true } }
                }
              }
            }
          })
        } catch {
          // Class might have been created by another request — try fetching again
          classRecord = await db.class.findUnique({
            where: { departmentCode_semesterNumber_division: { departmentCode: dept, semesterNumber: sem, division: div } },
            include: {
              cr: { select: { id: true, name: true, email: true, rollNumber: true } },
              members: {
                include: {
                  user: { select: { id: true, name: true, email: true, rollNumber: true, xp: true, streak: true, role: true } }
                },
                orderBy: [{ user: { rollNumber: "asc" } }, { user: { name: "asc" } }]
              }
            }
          })
        }
      }

      // Auto-add user as member if not already
      if (classRecord && !classRecord.members.some(m => m.userId === user.id)) {
        try {
          await db.classMember.create({
            data: { classId: classRecord.id, userId: user.id }
          })
          // Re-fetch with the new member
          classRecord = await db.class.findUnique({
            where: { id: classRecord.id },
            include: {
              cr: { select: { id: true, name: true, email: true, rollNumber: true } },
              members: {
                include: {
                  user: { select: { id: true, name: true, email: true, rollNumber: true, xp: true, streak: true, role: true } }
                },
                orderBy: [{ user: { rollNumber: "asc" } }, { user: { name: "asc" } }]
              }
            }
          })
        } catch {}
      }

      // If user is CR, assign them as CR
      if (classRecord && dbUser.role === 'cr' && classRecord.crId !== user.id) {
        try {
          await db.class.update({
            where: { id: classRecord.id },
            data: { crId: user.id }
          })
          classRecord = { ...classRecord, crId: user.id, cr: { id: user.id, name: dbUser.name, email: dbUser.email, rollNumber: dbUser.rollNumber } }
        } catch {}
      }

      return NextResponse.json({ ok: true, data: classRecord })
    }

    if (action === 'class') {
      const classId = url.searchParams.get('id')
      if (!classId) return NextResponse.json({ error: 'Missing class id' }, { status: 400 })

      const classRecord = await db.class.findUnique({
        where: { id: classId },
        include: {
          cr: { select: { id: true, name: true, email: true, rollNumber: true } },
          members: {
            include: {
              user: { select: { id: true, name: true, email: true, rollNumber: true, xp: true, streak: true, role: true } }
            },
            orderBy: [{ user: { rollNumber: "asc" } }, { user: { name: "asc" } }]
          }
        }
      })

      if (!classRecord) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

      return NextResponse.json({ ok: true, data: classRecord })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('[class API]', err)
    // Check if this is a "table does not exist" error (migrations not applied)
    const errMsg = err instanceof Error ? err.message : String(err)
    if (errMsg.includes('does not exist') || errMsg.includes('relation') || errMsg.includes('table')) {
      return NextResponse.json({
        error: 'Database tables not set up yet. An admin needs to run: npx prisma migrate deploy',
      }, { status: 500 })
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/**
 * PATCH /api/class
 * Body: { classId, alias?, avatarEmoji?, avatarColor?, setCR? }
 * - alias/avatarEmoji/avatarColor: update class identity (admin/CR/teacher)
 * - setCR: assign a user as CR of this class (admin only)
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await req.json().catch(() => null)
    if (!body?.classId) return NextResponse.json({ error: 'Missing classId' }, { status: 400 })

    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { role: true, departmentCode: true },
    })
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const existing = await db.class.findUnique({
      where: { id: body.classId },
      select: { id: true, departmentCode: true, crId: true },
    })
    if (!existing) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

    // Permission check
    const isStaff = dbUser.role === 'admin' || dbUser.role === 'coordinator' || dbUser.role === 'teacher'
    const isCR = dbUser.role === 'cr' && existing.crId === user.id
    if (!isStaff && !isCR) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const data: any = {}

    // Identity updates
    if (typeof body.alias === 'string') {
      data.alias = body.alias.trim().slice(0, 60) || null
      data.aliasUpdatedBy = user.id
      data.aliasUpdatedAt = new Date()
    }
    if (typeof body.avatarEmoji === 'string') {
      data.avatarEmoji = body.avatarEmoji.trim().slice(0, 8) || null
    }
    if (typeof body.avatarColor === 'string') {
      const c = body.avatarColor.trim().slice(0, 9)
      data.avatarColor = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c) ? c.toLowerCase() : null
    }

    // CR assignment (admin only)
    if (body.setCR) {
      if (dbUser.role !== 'admin') {
        return NextResponse.json({ error: 'Only admins can assign CRs' }, { status: 403 })
      }
      // Verify the target user exists and is a student/cr
      const targetUser = await db.user.findUnique({
        where: { id: body.setCR },
        select: { id: true, role: true, name: true },
      })
      if (!targetUser) return NextResponse.json({ error: 'Target user not found' }, { status: 404 })

      // Update the user's role to 'cr'
      await db.user.update({
        where: { id: body.setCR },
        data: { role: 'cr', isCR: true },
      })

      // Set them as CR of this class
      data.crId = body.setCR
    }

    // Also update the user's departmentCode/semesterNumber/division if setCR is used
    // (so they join the class as a member)
    if (body.setCR) {
      const cls = await db.class.findUnique({
        where: { id: body.classId },
        select: { departmentCode: true, semesterNumber: true, division: true },
      })
      if (cls) {
        await db.user.update({
          where: { id: body.setCR },
          data: {
            departmentCode: cls.departmentCode,
            semesterNumber: cls.semesterNumber,
            division: cls.division,
          },
        })

        // Add as class member if not already
        const existingMember = await db.classMember.findUnique({
          where: { classId_userId: { classId: body.classId, userId: body.setCR } },
          select: { id: true },
        }).catch(() => null)

        if (!existingMember) {
          await db.classMember.create({
            data: { classId: body.classId, userId: body.setCR },
          }).catch(() => {})
        }
      }
    }

    const updated = await db.class.update({
      where: { id: body.classId },
      data,
      include: {
        cr: { select: { id: true, name: true, email: true } },
        _count: { select: { members: true } },
      },
    })

    return NextResponse.json({ ok: true, data: updated })
  } catch (err) {
    console.error('[class API PATCH]', err)
    const errMsg = err instanceof Error ? err.message : String(err)
    if (errMsg.includes('does not exist') || errMsg.includes('relation') || errMsg.includes('table')) {
      return NextResponse.json({
        error: 'Database tables not set up yet. Run: npx prisma migrate deploy',
      }, { status: 500 })
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

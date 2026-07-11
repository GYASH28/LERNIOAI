import { z } from 'zod'
import { db } from '@/lib/db'
import { ApiError, okResponse, requireActiveRole, withApi } from '@/lib/auth'
import { assertNotFinalActiveAdmin } from '@/lib/authority/admin-guards'
import { writeAuditEvent } from '@/lib/authority/audit'
import type { Role } from '@/lib/roles'

const PatchUserSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  status: z.enum(['active', 'disabled']).optional(),
  role: z.enum(['student', 'cr', 'teacher', 'coordinator', 'moderator', 'reviewer', 'admin']).optional(),
  departmentCode: z.string().trim().max(32).nullable().optional(),
})

function activeWindow(now: Date) {
  return {
    status: 'active',
    revokedAt: null,
    startsAt: { lte: now },
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  }
}

async function assertPrimaryRoleIsBackedByAuthority(userId: string, nextRole: Role) {
  if (nextRole === 'admin') return

  const now = new Date()
  const activeAssignmentWhere = activeWindow(now)

  if (nextRole === 'student') {
    const [roleAssignment, teachingAssignment, crMembership] = await Promise.all([
      db.roleAssignment.findFirst({
        where: { userId, ...activeAssignmentWhere },
        select: { id: true, role: true },
      }),
      db.teachingAssignment.findFirst({
        where: { teacherId: userId, ...activeAssignmentWhere },
        select: { id: true },
      }),
      db.classMembership.findFirst({
        where: { userId, role: 'cr', status: 'active', leftAt: null },
        select: { id: true },
      }),
    ])
    if (roleAssignment || teachingAssignment || crMembership) {
      throw new ApiError(
        'ACTIVE_AUTHORITY_REMAINS',
        'Revoke this user’s active role, teaching, and CR assignments before setting the primary role to student.',
        409,
        false,
      )
    }
    return
  }

  if (nextRole === 'teacher') {
    const [roleAssignment, teachingAssignment] = await Promise.all([
      db.roleAssignment.findFirst({
        where: { userId, role: 'teacher', ...activeAssignmentWhere },
        select: { id: true },
      }),
      db.teachingAssignment.findFirst({
        where: { teacherId: userId, ...activeAssignmentWhere },
        select: { id: true },
      }),
    ])
    if (roleAssignment || teachingAssignment) return
  } else if (nextRole === 'cr') {
    const [roleAssignment, membership] = await Promise.all([
      db.roleAssignment.findFirst({
        where: { userId, role: 'cr', ...activeAssignmentWhere },
        select: { id: true },
      }),
      db.classMembership.findFirst({
        where: { userId, role: 'cr', status: 'active', leftAt: null },
        select: { id: true },
      }),
    ])
    if (roleAssignment || membership) return
  } else {
    const roleAssignment = await db.roleAssignment.findFirst({
      where: { userId, role: nextRole, ...activeAssignmentWhere },
      select: { id: true },
    })
    if (roleAssignment) return
  }

  throw new ApiError(
    'ROLE_SCOPE_REQUIRED',
    `Create an active scoped ${nextRole} assignment before making it the user’s primary role.`,
    409,
    false,
  )
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    const authority = await requireActiveRole('admin')
    const { id } = await ctx.params
    const body = await request.json().catch(() => null)
    const parsed = PatchUserSchema.safeParse(body)
    if (!parsed.success) {
      throw new ApiError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid user payload.', 400, false)
    }

    const target = await db.user.findUnique({
      where: { id },
      select: { id: true, role: true, status: true, email: true },
    })
    if (!target) throw new ApiError('NOT_FOUND', 'User not found.', 404, false)

    const demotingAdmin = target.role === 'admin' && parsed.data.role && parsed.data.role !== 'admin'
    const disablingAdmin = target.role === 'admin' && parsed.data.status === 'disabled'
    if (demotingAdmin || disablingAdmin) {
      await assertNotFinalActiveAdmin(id)
    }

    if (parsed.data.role && parsed.data.role !== target.role) {
      // Skip authority check for CR and student roles — we use our own
      // Class model for CR assignment, not the old authority system.
      // The authority check requires a RoleAssignment record which we
      // don't create (and don't need) for CR/student roles.
      if (parsed.data.role !== 'cr' && parsed.data.role !== 'student') {
        await assertPrimaryRoleIsBackedByAuthority(id, parsed.data.role)
      }
    }

    const user = await db.user.update({
      where: { id },
      data: {
        ...parsed.data,
        authorityVersion: { increment: 1 },
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        departmentCode: true,
        authorityVersion: true,
      },
    })

    await writeAuditEvent({
      actorUserId: authority.user.id,
      targetUserId: id,
      action: 'user.updated',
      entityType: 'User',
      entityId: id,
      summary: `Updated user ${target.email}`,
      metadata: parsed.data,
    })

    return okResponse({ user })
  })
}

/**
 * DELETE /api/admin/users/[id]
 * Permanently delete a user account. Cascading deletes clean up:
 * - ClassMember entries (class memberships)
 * - AttendanceRecord entries
 * - AttendanceSession entries (sessions they took)
 * - ClassAnnouncement entries (announcements they authored)
 * - ClassTimetable entries (slots they taught)
 * - RecentlyViewed, Bookmarks, Notifications, Feedback, etc.
 *
 * Safety:
 * - Admin cannot delete themselves
 * - Admin cannot delete the last remaining admin account
 */
export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    const authority = await requireActiveRole('admin')
    const { id } = await ctx.params

    // Safety 1: Can't delete yourself
    if (id === authority.user.id) {
      throw new ApiError(
        'CANNOT_DELETE_SELF',
        'You cannot delete your own account. Ask another admin to do it.',
        400,
        false,
      )
    }

    // Fetch the target user
    const target = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
      },
    })
    if (!target) {
      throw new ApiError('NOT_FOUND', 'User not found.', 404, false)
    }

    // Safety 2: Can't delete the last admin
    if (target.role === 'admin') {
      const adminCount = await db.user.count({
        where: { role: 'admin', status: 'active' },
      })
      if (adminCount <= 1) {
        throw new ApiError(
          'LAST_ADMIN',
          'Cannot delete the last active admin account. Promote another user to admin first.',
          400,
          false,
        )
      }
    }

    // If the target is a CR, unset them as CR on their class first
    if (target.role === 'cr') {
      await db.class.updateMany({
        where: { crId: id },
        data: { crId: null },
      }).catch(() => {})
    }

    // Clean up ALL related records BEFORE deleting the user.
    // Same approach as DELETE /api/user — use Promise.allSettled so
    // failures don't block the deletion.
    const cleanup = [
      db.tutorMessage.deleteMany({ where: { session: { userId: id } } }),
      db.tutorSession.deleteMany({ where: { userId: id } }),
      db.questionAttempt.deleteMany({ where: { userId: id } }),
      db.quizAttempt.deleteMany({ where: { userId: id } }),
      db.userTopicMastery.deleteMany({ where: { userId: id } }),
      db.revisionSchedule.deleteMany({ where: { userId: id } }),
      db.revisionAttempt.deleteMany({ where: { userId: id } }),
      db.lessonCompletion.deleteMany({ where: { userId: id } }),
      db.studyTask.deleteMany({ where: { userId: id } }),
      db.studySession.deleteMany({ where: { userId: id } }),
      db.codingSubmission.deleteMany({ where: { userId: id } }),
      db.labProgress.deleteMany({ where: { userId: id } }),
      db.userAchievement.deleteMany({ where: { userId: id } }),
      db.xpEvent.deleteMany({ where: { userId: id } }),
      db.contribution.deleteMany({ where: { userId: id } }),
      db.bookmark.deleteMany({ where: { userId: id } }),
      db.roleRequest.deleteMany({ where: { userId: id } }),
      db.institutionMembership.deleteMany({ where: { userId: id } }),
      db.notification.deleteMany({ where: { userId: id } }),
      db.feedback.deleteMany({ where: { userId: id } }),
      db.recentlyViewed.deleteMany({ where: { userId: id } }),
      db.videoWatchProgress.deleteMany({ where: { userId: id } }),
      db.studentElectiveSelection.deleteMany({ where: { userId: id } }),
      db.classMember.deleteMany({ where: { userId: id } }),
      db.attendanceRecord.deleteMany({ where: { userId: id } }),
      db.attendanceSession.deleteMany({ where: { takenById: id } }),
      db.classAnnouncement.deleteMany({ where: { authorId: id } }),
      db.classTimetable.deleteMany({ where: { teacherId: id } }),
      db.class.updateMany({ where: { crId: id }, data: { crId: null } }),
      db.roleAssignment.deleteMany({ where: { userId: id } }),
      db.classMembership.deleteMany({ where: { userId: id } }),
      db.teachingAssignment.deleteMany({ where: { teacherId: id } }),
      db.teachingAssignment.deleteMany({ where: { assignedById: id } }),
      db.authorityGrant.deleteMany({ where: { userId: id } }),
      db.authorityGrant.deleteMany({ where: { createdById: id } }),
      db.authorityGrant.deleteMany({ where: { revokedById: id } }),
      db.auditEvent.deleteMany({ where: { actorUserId: id } }),
      db.auditEvent.deleteMany({ where: { targetUserId: id } }),
      db.roleAuditLog.deleteMany({ where: { actorUserId: id } }),
      db.roleAuditLog.deleteMany({ where: { targetUserId: id } }),
      db.account.deleteMany({ where: { userId: id } }),
      db.session.deleteMany({ where: { userId: id } }),
    ]

    await Promise.allSettled(cleanup)

    // Now delete the user
    await db.user.deleteMany({ where: { id } })

    // Write audit event
    await writeAuditEvent({
      actorUserId: authority.user.id,
      targetUserId: id,
      action: 'user.deleted',
      entityType: 'User',
      entityId: id,
      summary: `Deleted user ${target.email} (${target.name})`,
      metadata: { deletedEmail: target.email, deletedName: target.name, deletedRole: target.role },
    })

    return okResponse({ deleted: true, email: target.email, name: target.name })
  })
}

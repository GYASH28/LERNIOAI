import { db } from '@/lib/db'
import { ApiError, okResponse, requireActiveRole, withApi } from '@/lib/auth'
import { assertNotFinalActiveAdmin } from '@/lib/authority/admin-guards'
import { writeAuditEvent } from '@/lib/authority/audit'

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  return withApi(async () => {
    const authority = await requireActiveRole('admin')
    const { id } = await ctx.params
    const assignment = await db.roleAssignment.findUnique({
      where: { id },
      select: { id: true, userId: true, role: true, status: true, user: { select: { email: true } } },
    })
    if (!assignment) throw new ApiError('NOT_FOUND', 'Role assignment not found.', 404, false)
    if (assignment.role === 'admin' && assignment.status === 'active') {
      await assertNotFinalActiveAdmin(assignment.userId)
    }

    const revoked = await db.$transaction(async (tx) => {
      const row = await tx.roleAssignment.update({
        where: { id },
        data: {
          status: 'revoked',
          revokedAt: new Date(),
          revokedById: authority.user.id,
        },
        select: { id: true, role: true, status: true, revokedAt: true },
      })
      await tx.user.update({
        where: { id: assignment.userId },
        data: { authorityVersion: { increment: 1 } },
      })
      return row
    })

    await writeAuditEvent({
      actorUserId: authority.user.id,
      targetUserId: assignment.userId,
      action: 'role_assignment.revoked',
      entityType: 'RoleAssignment',
      entityId: assignment.id,
      summary: `Revoked ${assignment.role} from ${assignment.user.email}`,
    })

    return okResponse({ assignment: revoked })
  })
}

import { ApiError, okResponse, requireActiveRole, withApi } from '@/lib/auth'
import { assertNotFinalActiveAdmin } from '@/lib/authority/admin-guards'
import { revokeAuthorityGrantByAssignment } from '@/lib/authority/grants'
import { db } from '@/lib/db'

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

    const revoked = await revokeAuthorityGrantByAssignment({
      assignmentId: assignment.id,
      actorUserId: authority.user.id,
    })

    return okResponse({ assignment: revoked.assignment, revokedAssignmentIds: revoked.revokedAssignmentIds })
  })
}

import { db } from '@/lib/db'
import { ApiError, okResponse, requireUser, withApi } from '@/lib/auth'
import { parseBody, createRoleRequestSchema } from '@/lib/schemas'
import { normalizeRole } from '@/lib/roles'

export async function POST(request: Request) {
  return withApi(async () => {
    const user = await requireUser()
    const body = await parseBody(request, createRoleRequestSchema)
    const requestedRole = normalizeRole(body.requestedRole)

    if (requestedRole === 'student' || requestedRole === 'admin') {
      throw new ApiError('INVALID_ROLE_REQUEST', 'This role cannot be requested from self-service signup.', 400, false)
    }

    const existing = await db.roleRequest.findFirst({
      where: {
        userId: user.id,
        requestedRole,
        status: 'pending',
      },
      select: { id: true },
    })
    if (existing) {
      throw new ApiError('ROLE_REQUEST_EXISTS', 'You already have a pending request for this role.', 409, false)
    }

    const requestRow = await db.roleRequest.create({
      data: {
        userId: user.id,
        requestedRole,
        reason: body.reason ?? null,
        departmentCode: body.departmentCode ?? null,
        subjectIds: body.subjectIds?.length ? JSON.stringify(body.subjectIds) : null,
      },
      select: {
        id: true,
        requestedRole: true,
        reason: true,
        departmentCode: true,
        subjectIds: true,
        status: true,
        createdAt: true,
      },
    })

    await db.roleAuditLog.create({
      data: {
        actorUserId: user.id,
        targetUserId: user.id,
        action: 'role_requested',
        role: requestedRole,
        scope: body.departmentCode ?? null,
      },
    })

    return okResponse(requestRow)
  })
}

import { z } from 'zod'
import { db } from '@/lib/db'
import { ApiError, okResponse, requireActiveRole, withApi } from '@/lib/auth'
import { canAssignRole, normalizeRole, type Role } from '@/lib/roles'
import { writeAuditEvent } from '@/lib/authority/audit'

export async function GET() {
  return withApi(async () => {
    await requireActiveRole('admin')
    const assignments = await db.roleAssignment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        role: true,
        status: true,
        institutionId: true,
        departmentCode: true,
        classGroupId: true,
        subjectId: true,
        startsAt: true,
        expiresAt: true,
        revokedAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    })
    return okResponse({ assignments })
  })
}

const CreateAssignmentSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['cr', 'teacher', 'coordinator', 'moderator', 'reviewer']),
  institutionId: z.string().trim().min(1).nullable().optional(),
  departmentCode: z.string().trim().max(32).nullable().optional(),
  classGroupId: z.string().trim().min(1).nullable().optional(),
  subjectId: z.string().trim().min(1).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  reason: z.string().trim().max(1000).optional(),
})

type AssignmentScope = {
  institutionId: string | null
  departmentCode: string | null
  classGroupId: string | null
  subjectId: string | null
}

function assertValidRoleScope(role: Role, scope: AssignmentScope) {
  const valid = (() => {
    switch (role) {
      case 'cr':
        return Boolean(scope.classGroupId)
      case 'teacher':
        return Boolean(scope.subjectId || scope.classGroupId)
      case 'coordinator':
        return Boolean(scope.departmentCode)
      case 'reviewer':
        return Boolean(scope.subjectId || scope.departmentCode)
      case 'moderator':
        return Boolean(scope.institutionId || scope.departmentCode)
      default:
        return false
    }
  })()

  if (valid) return

  const requirement: Partial<Record<Role, string>> = {
    cr: 'Class Representative assignments require a class-group ID.',
    teacher: 'Teacher assignments require a subject ID or class-group ID.',
    coordinator: 'Coordinator assignments require a department code.',
    reviewer: 'Reviewer assignments require a subject ID or department code.',
    moderator: 'Moderator assignments require an institution ID or department code.',
  }
  throw new ApiError(
    'INVALID_ROLE_SCOPE',
    requirement[role] ?? 'The selected role does not support this scope.',
    400,
    false,
  )
}

export async function POST(request: Request) {
  return withApi(async () => {
    const authority = await requireActiveRole('admin')
    const body = await request.json().catch(() => null)
    const parsed = CreateAssignmentSchema.safeParse(body)
    if (!parsed.success) {
      throw new ApiError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid assignment payload.', 400, false)
    }

    const role = normalizeRole(parsed.data.role)
    if (!canAssignRole('admin', role)) {
      throw new ApiError('FORBIDDEN', 'This role cannot be assigned by this account.', 403, false)
    }

    const scope: AssignmentScope = {
      institutionId: parsed.data.institutionId || null,
      departmentCode: parsed.data.departmentCode?.toUpperCase() || null,
      classGroupId: parsed.data.classGroupId || null,
      subjectId: parsed.data.subjectId || null,
    }
    assertValidRoleScope(role, scope)

    const expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null
    if (expiresAt && expiresAt <= new Date()) {
      throw new ApiError('INVALID_EXPIRY', 'The assignment expiry must be in the future.', 400, false)
    }

    const target = await db.user.findUnique({
      where: { id: parsed.data.userId },
      select: { id: true, email: true, status: true },
    })
    if (!target) throw new ApiError('NOT_FOUND', 'Target user not found.', 404, false)
    if (target.status !== 'active') {
      throw new ApiError('USER_DISABLED', 'Restore this account before assigning authority.', 409, false)
    }

    const existing = await db.roleAssignment.findFirst({
      where: {
        userId: target.id,
        role,
        status: 'active',
        revokedAt: null,
        institutionId: scope.institutionId,
        departmentCode: scope.departmentCode,
        classGroupId: scope.classGroupId,
        subjectId: scope.subjectId,
      },
      select: { id: true },
    })
    if (existing) {
      throw new ApiError('ASSIGNMENT_EXISTS', 'This active scoped role assignment already exists.', 409, false)
    }

    const assignment = await db.$transaction(async (tx) => {
      const row = await tx.roleAssignment.create({
        data: {
          userId: target.id,
          role,
          status: 'active',
          ...scope,
          assignedById: authority.user.id,
          expiresAt,
          reason: parsed.data.reason ?? null,
        },
        select: { id: true, role: true, status: true },
      })
      await tx.user.update({
        where: { id: target.id },
        data: { authorityVersion: { increment: 1 } },
      })
      return row
    })

    await writeAuditEvent({
      actorUserId: authority.user.id,
      targetUserId: target.id,
      action: 'role_assignment.created',
      entityType: 'RoleAssignment',
      entityId: assignment.id,
      summary: `Assigned ${role} to ${target.email}`,
      metadata: { role, ...scope, expiresAt: expiresAt?.toISOString() ?? null, reason: parsed.data.reason ?? null },
    })

    return okResponse({ assignment })
  })
}

import { z } from 'zod'
import { db } from '@/lib/db'
import { ApiError, okResponse, requireActiveRole, withApi } from '@/lib/auth'
import { canAssignRole, normalizeRole } from '@/lib/roles'
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
  institutionId: z.string().nullable().optional(),
  departmentCode: z.string().trim().max(32).nullable().optional(),
  classGroupId: z.string().nullable().optional(),
  subjectId: z.string().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  reason: z.string().trim().max(1000).optional(),
})

export async function POST(request: Request) {
  return withApi(async () => {
    const authority = await requireActiveRole('admin')
    const body = await request.json().catch(() => null)
    const parsed = CreateAssignmentSchema.safeParse(body)
    if (!parsed.success) {
      throw new ApiError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid assignment payload.', 400, false)
    }

    const role = normalizeRole(parsed.data.role)
    if (!canAssignRole(authority.primaryRole, role)) {
      throw new ApiError('FORBIDDEN', 'This role cannot be assigned by this account.', 403, false)
    }

    const target = await db.user.findUnique({
      where: { id: parsed.data.userId },
      select: { id: true, email: true },
    })
    if (!target) throw new ApiError('NOT_FOUND', 'Target user not found.', 404, false)

    const assignment = await db.$transaction(async (tx) => {
      const row = await tx.roleAssignment.create({
        data: {
          userId: parsed.data.userId,
          role,
          status: 'active',
          institutionId: parsed.data.institutionId ?? null,
          departmentCode: parsed.data.departmentCode ?? null,
          classGroupId: parsed.data.classGroupId ?? null,
          subjectId: parsed.data.subjectId ?? null,
          assignedById: authority.user.id,
          expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
          reason: parsed.data.reason ?? null,
        },
        select: { id: true, role: true, status: true },
      })
      await tx.user.update({
        where: { id: parsed.data.userId },
        data: { authorityVersion: { increment: 1 } },
      })
      return row
    })

    await writeAuditEvent({
      actorUserId: authority.user.id,
      targetUserId: parsed.data.userId,
      action: 'role_assignment.created',
      entityType: 'RoleAssignment',
      entityId: assignment.id,
      summary: `Assigned ${role} to ${target.email}`,
      metadata: parsed.data,
    })

    return okResponse({ assignment })
  })
}

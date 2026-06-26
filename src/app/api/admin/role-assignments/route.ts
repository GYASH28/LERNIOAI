import { z } from 'zod'
import { db } from '@/lib/db'
import { ApiError, okResponse, requireActiveRole, withApi } from '@/lib/auth'
import { canAssignRole, normalizeRole } from '@/lib/roles'
import { createAuthorityGrant } from '@/lib/authority/grants'

export async function GET() {
  return withApi(async () => {
    await requireActiveRole('admin')
    const assignments = await db.roleAssignment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        authorityGrantId: true,
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
  subjectIds: z.array(z.string().trim().min(1)).max(20).optional(),
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
    if (!canAssignRole('admin', role)) {
      throw new ApiError('FORBIDDEN', 'This role cannot be assigned by this account.', 403, false)
    }

    const expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null
    if (expiresAt && expiresAt <= new Date()) {
      throw new ApiError('INVALID_EXPIRY', 'The assignment expiry must be in the future.', 400, false)
    }

    const subjectIds = Array.from(new Set([
      ...(parsed.data.subjectId ? [parsed.data.subjectId] : []),
      ...(parsed.data.subjectIds ?? []),
    ]))
    const result = await createAuthorityGrant({
      userId: parsed.data.userId,
      role,
      actorUserId: authority.user.id,
      institutionId: parsed.data.institutionId || null,
      departmentCode: parsed.data.departmentCode?.toUpperCase() || null,
      classGroupId: parsed.data.classGroupId || null,
      subjectIds,
      expiresAt,
      reason: parsed.data.reason ?? null,
      source: 'admin_console',
    })

    return okResponse({ assignment: result.roleAssignments[0], grant: result.grant })
  })
}

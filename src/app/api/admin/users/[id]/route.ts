import { z } from 'zod'
import { db } from '@/lib/db'
import { ApiError, okResponse, requireActiveRole, withApi } from '@/lib/auth'
import { assertNotFinalActiveAdmin } from '@/lib/authority/admin-guards'
import { writeAuditEvent } from '@/lib/authority/audit'

const PatchUserSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  status: z.enum(['active', 'disabled']).optional(),
  role: z.enum(['student', 'cr', 'teacher', 'coordinator', 'moderator', 'reviewer', 'admin']).optional(),
  departmentCode: z.string().trim().max(32).nullable().optional(),
})

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

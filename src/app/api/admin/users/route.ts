import { z } from 'zod'
import { db } from '@/lib/db'
import { ApiError, okResponse, requireActiveRole, withApi } from '@/lib/auth'
import { ROLES, normalizeRole } from '@/lib/roles'

const MAX_PAGE_SIZE = 50

export async function GET(request: Request) {
  return withApi(async () => {
    await requireActiveRole('admin')
    const url = new URL(request.url)
    const q = url.searchParams.get('q')?.trim()
    const role = url.searchParams.get('role')
    const page = Math.max(1, Number(url.searchParams.get('page') || 1))
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(url.searchParams.get('pageSize') || 20)))

    const where = {
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' as const } },
              { email: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(role && ROLES.includes(role as never) ? { role: normalizeRole(role) } : {}),
    }

    const [total, users] = await Promise.all([
      db.user.count({ where }),
      db.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          departmentCode: true,
          semesterNumber: true,
          division: true,
          profileComplete: true,
          authorityVersion: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ])

    return okResponse({ users, pagination: { total, page, pageSize } })
  })
}

const CreateUserSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  name: z.string().trim().min(2).max(120),
  role: z.enum(['student', 'cr', 'teacher', 'coordinator', 'moderator', 'reviewer']).default('student'),
  departmentCode: z.string().trim().max(32).optional(),
})

export async function POST(request: Request) {
  return withApi(async () => {
    const authority = await requireActiveRole('admin')
    const body = await request.json().catch(() => null)
    const parsed = CreateUserSchema.safeParse(body)
    if (!parsed.success) {
      throw new ApiError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid user payload.', 400, false)
    }

    const user = await db.user.create({
      data: {
        email: parsed.data.email,
        name: parsed.data.name,
        role: parsed.data.role,
        status: 'active',
        provider: 'password',
        profileComplete: false,
        preferredLang: 'en',
        departmentCode: parsed.data.departmentCode ?? null,
      },
      select: { id: true, email: true, name: true, role: true, status: true },
    })

    await db.auditEvent.create({
      data: {
        actorUserId: authority.user.id,
        targetUserId: user.id,
        action: 'user.created',
        entityType: 'User',
        entityId: user.id,
        summary: `Created user ${user.email}`,
        metadata: JSON.stringify({ role: user.role, departmentCode: parsed.data.departmentCode ?? null }),
      },
    })

    return okResponse({ user })
  })
}

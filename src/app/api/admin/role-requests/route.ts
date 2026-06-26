import { db } from '@/lib/db'
import { okResponse, requireActiveRole, withApi } from '@/lib/auth'

export async function GET() {
  return withApi(async () => {
    await requireActiveRole('admin')
    const requests = await db.roleRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        requestedRole: true,
        reason: true,
        departmentCode: true,
        subjectIds: true,
        status: true,
        reviewedBy: true,
        reviewedAt: true,
        reviewNote: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    })
    return okResponse({ requests })
  })
}

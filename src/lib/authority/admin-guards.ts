import 'server-only'

import { db } from '@/lib/db'
import { ApiError } from '@/lib/auth'

export async function assertNotFinalActiveAdmin(targetUserId: string) {
  const activeAdmins = await db.user.findMany({
    where: {
      status: 'active',
      OR: [
        { role: 'admin' },
        {
          roleAssignments: {
            some: {
              role: 'admin',
              status: 'active',
              revokedAt: null,
              startsAt: { lte: new Date() },
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
          },
        },
      ],
    },
    select: { id: true },
  })

  const adminIds = new Set(activeAdmins.map((admin) => admin.id))
  if (adminIds.has(targetUserId) && adminIds.size <= 1) {
    throw new ApiError(
      'FINAL_ADMIN_PROTECTED',
      'You cannot disable, delete, demote, or revoke the final active admin.',
      409,
      false,
    )
  }
}

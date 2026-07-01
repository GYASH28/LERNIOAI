import 'server-only'

import { ApiError } from '@/lib/auth'
import type { LearningOpsAccess } from '@/lib/learning/learning-ops-authority'

export function assertCanPromoteYouTubeCandidates(access: LearningOpsAccess) {
  const canPromote =
    access.authority.activeRoles.includes('admin') ||
    access.authority.capabilities.includes('resources.update') ||
    access.authority.capabilities.includes('resources.review') ||
    access.authority.capabilities.includes('resources.publish')

  if (!canPromote) {
    throw new ApiError('FORBIDDEN', 'You do not have permission to promote YouTube candidates.', 403, false)
  }
}

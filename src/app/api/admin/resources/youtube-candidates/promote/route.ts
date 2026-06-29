import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ApiError, okResponse, withApi } from '@/lib/auth'
import { requireLearningOpsPreviewAccess } from '@/lib/learning/learning-ops-authority'
import {
  PromoteYouTubeCandidateMappingsSchema,
  promoteYouTubeCandidateMappings,
} from '@/lib/resources/youtube-candidate-promotion'
import { parseBody } from '@/lib/schemas'

const reviewQueuePath = join(
  process.cwd(),
  'content',
  'resources',
  'youtube-candidates',
  'cwit-r23-youtube-candidate-review-queue.json',
)

export async function POST(request: Request) {
  return withApi(async () => {
    const access = await requireLearningOpsPreviewAccess()
    assertCanPromoteYouTubeCandidates(access)
    const body = await parseBody(request, PromoteYouTubeCandidateMappingsSchema)
    const url = new URL(request.url)
    const write = url.searchParams.get('write') === '1'
    const reviewQueue = JSON.parse(readFileSync(reviewQueuePath, 'utf8')) as unknown

    const result = await promoteYouTubeCandidateMappings({
      reviewQueue,
      decisions: body,
      actorUserId: access.authority.user.id,
      allowedSubjectIds: access.subjectIds,
      dryRun: !write,
    })

    return okResponse({ ...result, write })
  })
}

function assertCanPromoteYouTubeCandidates(access: Awaited<ReturnType<typeof requireLearningOpsPreviewAccess>>) {
  const canPromote =
    access.authority.activeRoles.includes('admin') ||
    access.authority.capabilities.includes('resources.update') ||
    access.authority.capabilities.includes('resources.review') ||
    access.authority.capabilities.includes('resources.publish')

  if (!canPromote) {
    throw new ApiError('FORBIDDEN', 'You do not have permission to promote YouTube candidates.', 403, false)
  }
}

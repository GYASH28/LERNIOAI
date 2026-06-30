import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { okResponse, withApi } from '@/lib/auth'
import { requireLearningOpsPreviewAccess } from '@/lib/learning/learning-ops-authority'
import { assertCanPromoteYouTubeCandidates } from '@/lib/resources/youtube-candidate-promotion-access'
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

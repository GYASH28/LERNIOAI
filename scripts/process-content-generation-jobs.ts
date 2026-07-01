import {
  createConfiguredLessonNoteArtifactStore,
  createConfiguredLessonNoteGenerationProvider,
  processNextContentGenerationJob,
} from '../src/lib/lesson-notes/generation-worker'
import { db } from '../src/lib/db'

async function main() {
  const limit = readLimit(process.argv)
  const provider = createConfiguredLessonNoteGenerationProvider()
  const artifactStore = createConfiguredLessonNoteArtifactStore()

  if (!provider) {
    throw new Error('LESSON_NOTE_GENERATOR_URL is not configured.')
  }
  if (!artifactStore) {
    throw new Error('LESSON_NOTE_ARTIFACT_STORE_URL is not configured.')
  }

  let processed = 0
  for (let i = 0; i < limit; i += 1) {
    const result = await processNextContentGenerationJob({
      provider,
      artifactStore,
      leaseOwner: `cli:${process.pid}`,
    })

    if (result.status === 'idle') break
    processed += 1
    console.warn(`[lesson-notes:worker] ${JSON.stringify(result)}`)
  }

  console.warn(`[lesson-notes:worker] processed ${processed} job(s).`)
}

function readLimit(argv: string[]): number {
  const index = argv.findIndex((arg) => arg === '--limit')
  const raw = index >= 0 ? argv[index + 1] : undefined
  const value = Number(raw ?? '1')
  return Number.isFinite(value) ? Math.min(25, Math.max(1, Math.round(value))) : 1
}

main()
  .catch((error) => {
    console.error('[lesson-notes:worker] failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await db.$disconnect().catch(() => {})
  })

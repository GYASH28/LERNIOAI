import { existsSync, readFileSync } from 'node:fs'
import { isAbsolute, join, relative } from 'node:path'
import { promoteYouTubeCandidateMappings } from '../src/lib/resources/youtube-candidate-promotion'

const root = process.cwd()
const defaultQueuePath = join(
  root,
  'content',
  'resources',
  'youtube-candidates',
  'cwit-r23-youtube-candidate-review-queue.json',
)

void main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

async function main() {
  const decisionsPath = argValue('--decisions')
  if (!decisionsPath) {
    throw new Error('Missing --decisions path. Provide a reviewed YouTube lesson-mapping decision JSON file.')
  }

  const queuePath = argValue('--queue') ?? defaultQueuePath
  const write = process.argv.includes('--write')
  const actorUserId = argValue('--actor-user-id') ?? 'dry-run'
  if (write && actorUserId === 'dry-run') {
    throw new Error('Missing --actor-user-id. A real reviewer/admin user id is required with --write.')
  }

  const allowedSubjectIds = commaList(argValue('--allowed-subject-ids'))
  const queue = readJson(queuePath)
  const decisions = normalizeDecisions(readJson(resolvePath(decisionsPath)))
  const result = await promoteYouTubeCandidateMappings({
    reviewQueue: queue,
    decisions,
    actorUserId,
    allowedSubjectIds: allowedSubjectIds.length ? allowedSubjectIds : null,
    dryRun: !write,
  })

  console.warn(
    `[youtube-promote] ${write ? 'wrote' : 'validated'} ${result.promoted.length} mapping(s) ` +
    `from ${relative(root, resolvePath(decisionsPath)).replaceAll('\\', '/')}`,
  )
}

function normalizeDecisions(raw: unknown): unknown {
  return Array.isArray(raw) ? { decisions: raw } : raw
}

function readJson(path: string): unknown {
  const fullPath = resolvePath(path)
  if (!existsSync(fullPath)) throw new Error(`File not found: ${path}`)
  return JSON.parse(readFileSync(fullPath, 'utf8')) as unknown
}

function resolvePath(path: string): string {
  return isAbsolute(path) ? path : join(root, path)
}

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name)
  if (index === -1) return null
  return process.argv[index + 1] ?? null
}

function commaList(value: string | null): string[] {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

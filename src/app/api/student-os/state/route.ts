import { NextRequest } from 'next/server'
import { ApiError, okResponse, requireUser, withApi } from '@/lib/auth'
import { db } from '@/lib/db'
import { STUDENT_OS_STORAGE } from '@/lib/student-os/catalog'

const RESOURCE_TYPE = 'student_os_state'
const MAX_PAYLOAD_BYTES = 256_000
const MAX_NOTEBOOK_ENTRIES = 500
const ALLOWED_KEYS = new Set<string>(Object.values(STUDENT_OS_STORAGE))

interface StoredStateEnvelope {
  version: 1
  updatedAt: string
  value: unknown
}

interface NotebookLikeEntry {
  id: string
  updatedAt?: string
  createdAt?: string
  [key: string]: unknown
}

export async function GET(req: NextRequest) {
  return withApi(async () => {
    const user = await requireUser()
    const key = requireStateKey(req.nextUrl.searchParams.get('key'))
    const record = await db.bookmark.findUnique({
      where: {
        userId_resourceType_resourceId: {
          userId: user.id,
          resourceType: RESOURCE_TYPE,
          resourceId: key,
        },
      },
      select: { label: true },
    })

    if (!record?.label) return okResponse(null)
    return okResponse(parseEnvelope(record.label))
  })
}

export async function PUT(req: NextRequest) {
  return withApi(async () => {
    const user = await requireUser()
    const body = await readBody(req)
    const key = requireStateKey(body.key)
    if (!Object.prototype.hasOwnProperty.call(body, 'value')) {
      throw new ApiError('BAD_REQUEST', 'A state value is required.', 400, false)
    }

    const envelope = await db.$transaction(async (tx) => {
      const existing = await tx.bookmark.findUnique({
        where: {
          userId_resourceType_resourceId: {
            userId: user.id,
            resourceType: RESOURCE_TYPE,
            resourceId: key,
          },
        },
        select: { label: true },
      })
      const remoteValue = existing?.label ? parseEnvelope(existing.label).value : undefined
      const mergedValue = mergeStateValue(key, remoteValue, body.value)
      const nextEnvelope: StoredStateEnvelope = {
        version: 1,
        updatedAt: new Date().toISOString(),
        value: mergedValue,
      }
      const serialized = JSON.stringify(nextEnvelope)
      assertPayloadSize(serialized)

      await tx.bookmark.upsert({
        where: {
          userId_resourceType_resourceId: {
            userId: user.id,
            resourceType: RESOURCE_TYPE,
            resourceId: key,
          },
        },
        update: { label: serialized },
        create: {
          userId: user.id,
          resourceType: RESOURCE_TYPE,
          resourceId: key,
          label: serialized,
        },
      })

      return nextEnvelope
    })

    return okResponse(envelope)
  })
}

export async function DELETE(req: NextRequest) {
  return withApi(async () => {
    const user = await requireUser()
    const key = requireStateKey(req.nextUrl.searchParams.get('key'))
    await db.bookmark.deleteMany({
      where: {
        userId: user.id,
        resourceType: RESOURCE_TYPE,
        resourceId: key,
      },
    })
    return okResponse({ key, deleted: true })
  })
}

async function readBody(req: NextRequest): Promise<Record<string, unknown>> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    throw new ApiError('BAD_REQUEST', 'Invalid request body.', 400, false)
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError('BAD_REQUEST', 'Student OS state is required.', 400, false)
  }
  return body as Record<string, unknown>
}

function requireStateKey(value: unknown): string {
  if (typeof value !== 'string' || !ALLOWED_KEYS.has(value)) {
    throw new ApiError('BAD_REQUEST', 'Unsupported Student OS state key.', 400, false)
  }
  return value
}

function mergeStateValue(key: string, remote: unknown, incoming: unknown): unknown {
  if (remote === undefined) return incoming

  if (key === STUDENT_OS_STORAGE.notebook) {
    return mergeNotebook(remote, incoming)
  }
  if (key === STUDENT_OS_STORAGE.missions) {
    return mergeMissionState(remote, incoming)
  }
  if (key === STUDENT_OS_STORAGE.focus) {
    return mergeMonotonicCounters(remote, incoming, ['completedSessions', 'totalMinutes'])
  }
  if (isRecord(remote) && isRecord(incoming)) {
    return { ...remote, ...incoming }
  }
  return incoming
}

function mergeNotebook(remote: unknown, incoming: unknown) {
  const remoteEntries = Array.isArray(remote) ? remote.filter(isNotebookEntry) : []
  const incomingEntries = Array.isArray(incoming) ? incoming.filter(isNotebookEntry) : []
  const byId = new Map<string, NotebookLikeEntry>()

  for (const entry of [...remoteEntries, ...incomingEntries]) {
    const existing = byId.get(entry.id)
    if (!existing || entryTimestamp(entry) >= entryTimestamp(existing)) {
      byId.set(entry.id, entry)
    }
  }

  return [...byId.values()]
    .sort((a, b) => entryTimestamp(b) - entryTimestamp(a))
    .slice(0, MAX_NOTEBOOK_ENTRIES)
}

function mergeMissionState(remote: unknown, incoming: unknown) {
  if (!isRecord(remote)) return incoming
  if (!isRecord(incoming)) return remote
  const remoteDate = typeof remote.date === 'string' ? remote.date : ''
  const incomingDate = typeof incoming.date === 'string' ? incoming.date : ''

  if (remoteDate !== incomingDate) {
    return incomingDate >= remoteDate ? incoming : remote
  }

  const completed = new Set<string>([
    ...stringArray(remote.completed),
    ...stringArray(incoming.completed),
  ])
  return {
    ...remote,
    ...incoming,
    date: incomingDate || remoteDate,
    completed: [...completed],
  }
}

function mergeMonotonicCounters(remote: unknown, incoming: unknown, fields: string[]) {
  if (!isRecord(remote)) return incoming
  if (!isRecord(incoming)) return remote
  const merged: Record<string, unknown> = { ...remote, ...incoming }
  for (const field of fields) {
    const remoteValue = finiteNumber(remote[field])
    const incomingValue = finiteNumber(incoming[field])
    merged[field] = Math.max(remoteValue, incomingValue)
  }
  return merged
}

function parseEnvelope(value: string): StoredStateEnvelope {
  try {
    const parsed = JSON.parse(value) as Partial<StoredStateEnvelope>
    if (
      parsed.version !== 1 ||
      typeof parsed.updatedAt !== 'string' ||
      Number.isNaN(Date.parse(parsed.updatedAt)) ||
      !Object.prototype.hasOwnProperty.call(parsed, 'value')
    ) {
      throw new Error('Invalid state envelope')
    }
    return parsed as StoredStateEnvelope
  } catch {
    throw new ApiError(
      'STATE_CORRUPTED',
      'Your synced Lernio state could not be read. Your device copy is still available.',
      409,
      false,
    )
  }
}

function assertPayloadSize(serialized: string) {
  if (Buffer.byteLength(serialized, 'utf8') <= MAX_PAYLOAD_BYTES) return
  throw new ApiError(
    'PAYLOAD_TOO_LARGE',
    'This Lernio state is too large to sync. Export or remove older entries and try again.',
    413,
    false,
  )
}

function isNotebookEntry(value: unknown): value is NotebookLikeEntry {
  return isRecord(value) && typeof value.id === 'string' && value.id.length > 0
}

function entryTimestamp(entry: NotebookLikeEntry) {
  const value = entry.updatedAt ?? entry.createdAt
  const timestamp = typeof value === 'string' ? Date.parse(value) : 0
  return Number.isFinite(timestamp) ? timestamp : 0
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function finiteNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

import { NextRequest } from 'next/server'
import { ApiError, okResponse, requireUser, withApi } from '@/lib/auth'
import { db } from '@/lib/db'
import { STUDENT_OS_STORAGE } from '@/lib/student-os/catalog'
import {
  assertStudentStatePayloadSize,
  mergeStateValue,
  parseEnvelope,
  type StoredStateEnvelope,
} from '@/lib/student-os/state-sync'

const RESOURCE_TYPE = 'student_os_state'
const ALLOWED_KEYS = new Set<string>(Object.values(STUDENT_OS_STORAGE))
let reportedSchemaFallback = false

export async function GET(req: NextRequest) {
  return withApi(async () => {
    const user = await requireUser()
    const key = requireStateKey(req.nextUrl.searchParams.get('key'))

    try {
      const normalized = await db.studentStateRecord.findUnique({
        where: { userId_key: { userId: user.id, key } },
        select: { valueJson: true, deletedAt: true },
      })
      if (normalized) {
        if (normalized.deletedAt || !normalized.valueJson) return okResponse(null)
        return okResponse(parseEnvelope(normalized.valueJson))
      }

      const legacyEnvelope = await readLegacyEnvelope(user.id, key)
      if (!legacyEnvelope) return okResponse(null)

      await db.studentStateRecord.upsert({
        where: { userId_key: { userId: user.id, key } },
        update: {},
        create: {
          userId: user.id,
          key,
          valueJson: JSON.stringify(legacyEnvelope),
          migratedFromLegacyAt: new Date(),
        },
      })
      return okResponse(legacyEnvelope)
    } catch (error) {
      if (!isStudentStateSchemaMismatch(error)) throw error
      reportSchemaFallback()
      return okResponse(await readLegacyEnvelope(user.id, key))
    }
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

    try {
      const envelope = await writeNormalizedState(user.id, key, body.value)
      return okResponse(envelope)
    } catch (error) {
      if (!isStudentStateSchemaMismatch(error)) throw error
      reportSchemaFallback()
      return okResponse(await writeLegacyState(user.id, key, body.value))
    }
  })
}

export async function DELETE(req: NextRequest) {
  return withApi(async () => {
    const user = await requireUser()
    const key = requireStateKey(req.nextUrl.searchParams.get('key'))

    try {
      await db.$transaction(async (tx) => {
        await tx.studentStateRecord.upsert({
          where: { userId_key: { userId: user.id, key } },
          update: {
            valueJson: null,
            version: { increment: 1 },
            deletedAt: new Date(),
          },
          create: {
            userId: user.id,
            key,
            valueJson: null,
            deletedAt: new Date(),
          },
        })
        await tx.bookmark.deleteMany({
          where: {
            userId: user.id,
            resourceType: RESOURCE_TYPE,
            resourceId: key,
          },
        })
      })
    } catch (error) {
      if (!isStudentStateSchemaMismatch(error)) throw error
      reportSchemaFallback()
      await deleteLegacyState(user.id, key)
    }

    return okResponse({ key, deleted: true })
  })
}

async function writeNormalizedState(
  userId: string,
  key: string,
  value: unknown,
): Promise<StoredStateEnvelope> {
  return db.$transaction(async (tx) => {
    const normalized = await tx.studentStateRecord.findUnique({
      where: { userId_key: { userId, key } },
      select: { valueJson: true, deletedAt: true },
    })
    const existing = normalized
      ? null
      : await tx.bookmark.findUnique({
          where: {
            userId_resourceType_resourceId: {
              userId,
              resourceType: RESOURCE_TYPE,
              resourceId: key,
            },
          },
          select: { label: true },
        })
    const storedEnvelope = normalized?.deletedAt
      ? null
      : normalized?.valueJson ?? existing?.label ?? null
    const nextEnvelope = createMergedEnvelope(key, storedEnvelope, value)
    const serialized = JSON.stringify(nextEnvelope)
    assertStudentStatePayloadSize(key, serialized)

    await tx.studentStateRecord.upsert({
      where: { userId_key: { userId, key } },
      update: {
        valueJson: serialized,
        version: { increment: 1 },
        deletedAt: null,
        migratedFromLegacyAt: normalized ? undefined : new Date(),
      },
      create: {
        userId,
        key,
        valueJson: serialized,
        version: 1,
        migratedFromLegacyAt: existing ? new Date() : null,
      },
    })

    // Temporary dual-write keeps older deployed clients compatible while the
    // normalized migration is observed in production.
    await tx.bookmark.upsert({
      where: {
        userId_resourceType_resourceId: {
          userId,
          resourceType: RESOURCE_TYPE,
          resourceId: key,
        },
      },
      update: { label: serialized },
      create: {
        userId,
        resourceType: RESOURCE_TYPE,
        resourceId: key,
        label: serialized,
      },
    })

    return nextEnvelope
  })
}

async function readLegacyEnvelope(
  userId: string,
  key: string,
): Promise<StoredStateEnvelope | null> {
  const record = await db.bookmark.findUnique({
    where: {
      userId_resourceType_resourceId: {
        userId,
        resourceType: RESOURCE_TYPE,
        resourceId: key,
      },
    },
    select: { label: true },
  })
  return record?.label ? parseEnvelope(record.label) : null
}

async function writeLegacyState(
  userId: string,
  key: string,
  value: unknown,
): Promise<StoredStateEnvelope> {
  const existing = await db.bookmark.findUnique({
    where: {
      userId_resourceType_resourceId: {
        userId,
        resourceType: RESOURCE_TYPE,
        resourceId: key,
      },
    },
    select: { label: true },
  })
  const nextEnvelope = createMergedEnvelope(key, existing?.label ?? null, value)
  const serialized = JSON.stringify(nextEnvelope)
  assertStudentStatePayloadSize(key, serialized)

  await db.bookmark.upsert({
    where: {
      userId_resourceType_resourceId: {
        userId,
        resourceType: RESOURCE_TYPE,
        resourceId: key,
      },
    },
    update: { label: serialized },
    create: {
      userId,
      resourceType: RESOURCE_TYPE,
      resourceId: key,
      label: serialized,
    },
  })
  return nextEnvelope
}

async function deleteLegacyState(userId: string, key: string) {
  await db.bookmark.deleteMany({
    where: { userId, resourceType: RESOURCE_TYPE, resourceId: key },
  })
}

function createMergedEnvelope(
  key: string,
  storedEnvelope: string | null,
  localValue: unknown,
): StoredStateEnvelope {
  const remoteValue = storedEnvelope
    ? parseEnvelope(storedEnvelope).value
    : undefined
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    value: mergeStateValue(key, remoteValue, localValue),
  }
}

function isStudentStateSchemaMismatch(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as {
    code?: unknown
    message?: unknown
    meta?: { table?: unknown; column?: unknown }
  }
  if (candidate.code !== 'P2021' && candidate.code !== 'P2022') return false
  const details = [
    candidate.message,
    candidate.meta?.table,
    candidate.meta?.column,
  ]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
  return details.includes('StudentStateRecord')
}

function reportSchemaFallback() {
  if (reportedSchemaFallback) return
  reportedSchemaFallback = true
  console.warn(
    '[student-os] StudentStateRecord schema is unavailable; using the legacy account-state fallback until migrations are applied.',
  )
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

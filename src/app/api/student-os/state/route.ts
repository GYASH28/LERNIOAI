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

export async function GET(req: NextRequest) {
  return withApi(async () => {
    const user = await requireUser()
    const key = requireStateKey(req.nextUrl.searchParams.get('key'))
    const normalized = await db.studentStateRecord.findUnique({
      where: { userId_key: { userId: user.id, key } },
      select: { valueJson: true, deletedAt: true },
    })
    if (normalized) {
      if (normalized.deletedAt || !normalized.valueJson) return okResponse(null)
      return okResponse(parseEnvelope(normalized.valueJson))
    }

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
    const envelope = parseEnvelope(record.label)
    await db.studentStateRecord.upsert({
      where: { userId_key: { userId: user.id, key } },
      update: {},
      create: {
        userId: user.id,
        key,
        valueJson: record.label,
        migratedFromLegacyAt: new Date(),
      },
    })
    return okResponse(envelope)
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
      const normalized = await tx.studentStateRecord.findUnique({
        where: { userId_key: { userId: user.id, key } },
        select: { valueJson: true, deletedAt: true, version: true },
      })
      const existing = normalized
        ? null
        : await tx.bookmark.findUnique({
            where: {
              userId_resourceType_resourceId: {
                userId: user.id,
                resourceType: RESOURCE_TYPE,
                resourceId: key,
              },
            },
          select: { label: true },
        })
      const storedEnvelope = normalized?.deletedAt
        ? null
        : normalized?.valueJson ?? existing?.label ?? null
      const remoteValue = storedEnvelope ? parseEnvelope(storedEnvelope).value : undefined
      const mergedValue = mergeStateValue(key, remoteValue, body.value)
      const nextEnvelope: StoredStateEnvelope = {
        version: 1,
        updatedAt: new Date().toISOString(),
        value: mergedValue,
      }
      const serialized = JSON.stringify(nextEnvelope)
      assertStudentStatePayloadSize(key, serialized)

      await tx.studentStateRecord.upsert({
        where: { userId_key: { userId: user.id, key } },
        update: {
          valueJson: serialized,
          version: { increment: 1 },
          deletedAt: null,
          migratedFromLegacyAt: normalized ? undefined : new Date(),
        },
        create: {
          userId: user.id,
          key,
          valueJson: serialized,
          version: 1,
          migratedFromLegacyAt: existing ? new Date() : null,
        },
      })

      // Temporary dual-write keeps older deployed clients compatible while
      // the normalized migration is observed in production.
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
    await db.$transaction(async (tx) => {
      await tx.studentStateRecord.upsert({
        where: { userId_key: { userId: user.id, key } },
        update: { valueJson: null, version: { increment: 1 }, deletedAt: new Date() },
        create: { userId: user.id, key, valueJson: null, deletedAt: new Date() },
      })
      await tx.bookmark.deleteMany({
        where: {
          userId: user.id,
          resourceType: RESOURCE_TYPE,
          resourceId: key,
        },
      })
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

import { NextRequest } from 'next/server'
import { ApiError, okResponse, requireUser, withApi } from '@/lib/auth'
import { db } from '@/lib/db'
import { STUDENT_OS_STORAGE } from '@/lib/student-os/catalog'

const RESOURCE_TYPE = 'student_os_state'
const MAX_PAYLOAD_BYTES = 256_000
const ALLOWED_KEYS = new Set<string>(Object.values(STUDENT_OS_STORAGE))

interface StoredStateEnvelope {
  version: 1
  updatedAt: string
  value: unknown
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
    const envelope = parseEnvelope(record.label)
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

    const envelope: StoredStateEnvelope = {
      version: 1,
      updatedAt: new Date().toISOString(),
      value: body.value,
    }
    const serialized = JSON.stringify(envelope)
    if (Buffer.byteLength(serialized, 'utf8') > MAX_PAYLOAD_BYTES) {
      throw new ApiError(
        'PAYLOAD_TOO_LARGE',
        'This Lernio state is too large to sync. Export or remove older entries and try again.',
        413,
        false,
      )
    }

    await db.bookmark.upsert({
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

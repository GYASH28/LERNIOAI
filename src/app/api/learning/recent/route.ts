import { NextRequest } from 'next/server'
import { ApiError, okResponse, requireUser, withApi } from '@/lib/auth'
import { db } from '@/lib/db'

const ALLOWED_RESOURCE_TYPES = new Set(['lesson', 'subject', 'resource'])

export async function PUT(req: NextRequest) {
  return withApi(async () => {
    const user = await requireUser()
    const body = await readBody(req)
    const resourceType = requireShortString(body.resourceType, 'resource type', 40)
    const resourceId = requireShortString(body.resourceId, 'resource ID', 500)
    const title = requireShortString(body.title, 'title', 240)
    const href = requireInternalLearningHref(body.href)
    const scrollPos = optionalScrollPosition(body.scrollPos)

    if (!ALLOWED_RESOURCE_TYPES.has(resourceType)) {
      throw new ApiError('BAD_REQUEST', 'Unsupported learning resource type.', 400, false)
    }

    const record = await db.recentlyViewed.upsert({
      where: {
        userId_resourceType_resourceId: {
          userId: user.id,
          resourceType,
          resourceId,
        },
      },
      update: {
        title,
        href,
        scrollPos,
        viewedAt: new Date(),
      },
      create: {
        userId: user.id,
        resourceType,
        resourceId,
        title,
        href,
        scrollPos,
      },
      select: {
        resourceType: true,
        resourceId: true,
        title: true,
        href: true,
        scrollPos: true,
        viewedAt: true,
      },
    })

    return okResponse(record)
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
    throw new ApiError('BAD_REQUEST', 'Learning activity is required.', 400, false)
  }
  return body as Record<string, unknown>
}

function requireShortString(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== 'string') {
    throw new ApiError('BAD_REQUEST', `A valid ${label} is required.`, 400, false)
  }
  const normalized = value.trim()
  if (!normalized || normalized.length > maxLength) {
    throw new ApiError('BAD_REQUEST', `A valid ${label} is required.`, 400, false)
  }
  return normalized
}

function requireInternalLearningHref(value: unknown): string {
  const href = requireShortString(value, 'learning route', 700)
  if (!href.startsWith('/learn/') && !href.startsWith('/materials')) {
    throw new ApiError('BAD_REQUEST', 'Only internal Lernio learning routes can be saved.', 400, false)
  }
  return href
}

function optionalScrollPosition(value: unknown): number {
  if (value === undefined) return 0
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 10_000_000) {
    throw new ApiError('BAD_REQUEST', 'Invalid reading position.', 400, false)
  }
  return Math.round(value)
}

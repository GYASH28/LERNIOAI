import 'server-only'

import { db } from '@/lib/db'
import { rateLimitKey } from '@/lib/rate-limit-key'

export interface RateLimitInput {
  action: string
  identifier: string
  limit: number
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
  retryAfterSec: number
  backend: 'database' | 'memory'
}

type MemoryBucket = { count: number; resetAt: number }
const globalRateLimit = globalThis as typeof globalThis & {
  __lernioRateLimit?: Map<string, MemoryBucket>
}
const memoryBuckets = globalRateLimit.__lernioRateLimit ?? new Map<string, MemoryBucket>()
globalRateLimit.__lernioRateLimit = memoryBuckets

export async function checkRateLimit(input: RateLimitInput): Promise<RateLimitResult> {
  const now = new Date()
  const resetAt = new Date(now.getTime() + input.windowMs)
  const key = rateLimitKey(input.action, input.identifier)

  try {
    const existing = await db.rateLimitBucket.findUnique({ where: { key } })
    if (!existing || existing.resetAt <= now) {
      await db.rateLimitBucket.upsert({
        where: { key },
        update: { count: 1, resetAt },
        create: { key, count: 1, resetAt },
      })
      return { allowed: true, remaining: input.limit - 1, resetAt, retryAfterSec: 0, backend: 'database' }
    }

    if (existing.count >= input.limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: existing.resetAt,
        retryAfterSec: Math.max(1, Math.ceil((existing.resetAt.getTime() - now.getTime()) / 1000)),
        backend: 'database',
      }
    }

    const updated = await db.rateLimitBucket.update({
      where: { key },
      data: { count: { increment: 1 } },
      select: { count: true, resetAt: true },
    })
    return {
      allowed: true,
      remaining: Math.max(0, input.limit - updated.count),
      resetAt: updated.resetAt,
      retryAfterSec: 0,
      backend: 'database',
    }
  } catch {
    console.warn('[rate-limit] database limiter unavailable; using local development fallback')
    return checkMemoryRateLimit(key, input.limit, input.windowMs)
  }
}

function checkMemoryRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const current = memoryBuckets.get(key)
  if (!current || current.resetAt <= now) {
    const resetAtMs = now + windowMs
    memoryBuckets.set(key, { count: 1, resetAt: resetAtMs })
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: new Date(resetAtMs),
      retryAfterSec: 0,
      backend: 'memory',
    }
  }
  if (current.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(current.resetAt),
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
      backend: 'memory',
    }
  }
  current.count += 1
  return {
    allowed: true,
    remaining: Math.max(0, limit - current.count),
    resetAt: new Date(current.resetAt),
    retryAfterSec: 0,
    backend: 'memory',
  }
}

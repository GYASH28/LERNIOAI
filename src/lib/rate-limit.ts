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
    const result = await db.$queryRaw<Array<{ count: number; resetAt: Date }>>`
      INSERT INTO "RateLimitBucket" ("key", "count", "resetAt", "createdAt", "updatedAt")
      VALUES (${key}, 1, ${resetAt}, NOW(), NOW())
      ON CONFLICT ("key") DO UPDATE
      SET
        "count" = CASE
          WHEN "RateLimitBucket"."resetAt" <= NOW() THEN 1
          ELSE "RateLimitBucket"."count" + 1
        END,
        "resetAt" = CASE
          WHEN "RateLimitBucket"."resetAt" <= NOW() THEN ${resetAt}::timestamp
          ELSE "RateLimitBucket"."resetAt"
        END,
        "updatedAt" = NOW()
      RETURNING "count", "resetAt";
    `

    const updated = result[0]
    if (!updated) {
      throw new Error('Database insert/update returned no row')
    }

    // Convert PostgreSQL date/timestamp to Date object if it's returned as string/other
    const bucketResetAt = new Date(updated.resetAt)

    if (updated.count > input.limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: bucketResetAt,
        retryAfterSec: Math.max(1, Math.ceil((bucketResetAt.getTime() - now.getTime()) / 1000)),
        backend: 'database',
      }
    }

    return {
      allowed: true,
      remaining: Math.max(0, input.limit - updated.count),
      resetAt: bucketResetAt,
      retryAfterSec: 0,
      backend: 'database',
    }
  } catch (error) {
    const isProduction = process.env.NODE_ENV === 'production'
    const isSensitive = ['register', 'signup', 'login', 'signin', 'forgot-password', 'reset-password', 'verify-email', 'ai-chat', 'chat', 'tutor'].some(keyword => 
      input.action.toLowerCase().includes(keyword)
    )

    if (isProduction && isSensitive) {
      console.error('[rate-limit] Database rate limiter failed. Failing closed in production for sensitive action:', input.action, error)
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(now.getTime() + 60 * 1000), // Block for 60 seconds
        retryAfterSec: 60,
        backend: 'database',
      }
    }

    console.warn('[rate-limit] database limiter unavailable; using local development fallback', error)
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

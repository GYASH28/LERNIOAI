import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'

// Initialize NextAuth once at module load. If this throws, we catch it
// and provide a fallback handler that returns a clean error instead of
// crashing every /api/auth/* endpoint with a 500.
let handler: ((req: any) => Promise<any>) | null = null
let initError: string | null = null

try {
  handler = NextAuth(authOptions)
} catch (err) {
  initError = err instanceof Error ? err.message : 'Unknown NextAuth init error'
  console.error('[nextauth] Initialization failed:', initError)
}

async function rateLimitedHandler(req: NextRequest) {
  // If NextAuth failed to initialize, return a clean error.
  if (!handler) {
    return NextResponse.json(
      { error: 'Auth service unavailable', detail: initError },
      { status: 503 },
    )
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'

  // Rate limiting — wrapped in try/catch so DB issues never block auth.
  try {
    const globalLimit = await checkRateLimit({
      action: 'auth_global',
      identifier: ip,
      limit: 60,
      windowMs: 60 * 1000,
    })
    if (!globalLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const url = new URL(req.url)
    if (url.pathname === '/api/auth/callback/credentials') {
      const credLimit = await checkRateLimit({
        action: 'auth_cred_callback',
        identifier: ip,
        limit: 10,
        windowMs: 60 * 1000,
      })
      if (!credLimit.allowed) {
        return NextResponse.json({ error: 'Too many login attempts' }, { status: 429 })
      }
    }
  } catch {
    // DB unavailable — skip rate limiting, allow the request through.
  }

  // Call the NextAuth handler.
  // next-auth v4 expects a request with a `query` property (from Express-style
  // req). Next.js 16 route handlers use NextRequest which doesn't have `query`.
  // We create a shim object that merges url, method, headers, body, and query
  // so next-auth v4 can parse the route params correctly.
  try {
    const url = new URL(req.url)
    // Parse query params from the URL
    const query: Record<string, string | string[]> = {}
    url.searchParams.forEach((value, key) => {
      if (key in query) {
        const existing = query[key]
        query[key] = Array.isArray(existing) ? [...existing, value] : [existing, value]
      } else {
        query[key] = value
      }
    })

    // Read body for POST requests (credentials callback, etc.)
    let body: any = undefined
    if (req.method === 'POST') {
      try {
        const contentType = req.headers.get('content-type') || ''
        if (contentType.includes('application/json')) {
          body = await req.json()
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
          const text = await req.text()
          const params = new URLSearchParams(text)
          body = Object.fromEntries(params.entries())
        }
      } catch {
        // Body parsing failed — continue without body
      }
    }

    // Build a NextRequest-like object that includes `query`
    const shimmedReq = Object.assign(req, {
      query,
      body,
      headers: req.headers,
      method: req.method,
      url: req.url,
    }) as NextRequest

    return await handler(shimmedReq)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown auth handler error'
    console.error('[nextauth] Handler error:', message)
    return NextResponse.json(
      { error: 'Auth handler error', detail: message },
      { status: 500 },
    )
  }
}

export { rateLimitedHandler as GET, rateLimitedHandler as POST }

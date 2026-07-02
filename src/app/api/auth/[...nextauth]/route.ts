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

  // Call the NextAuth handler — wrapped in try/catch so any runtime
  // error returns a clean 500 with the error message instead of a
  // silent empty 500 response.
  try {
    return await handler(req)
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

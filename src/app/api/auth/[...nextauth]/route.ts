import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'

const handler = NextAuth(authOptions)

async function rateLimitedHandler(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'

  // Global limit: 60 requests per 60 seconds per IP across all next-auth endpoints.
  const globalLimit = await checkRateLimit({
    action: 'auth_global',
    identifier: ip,
    limit: 60,
    windowMs: 60 * 1000,
  })
  if (!globalLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  // Stricter limit on credential callback: 10 requests per 60 seconds per IP.
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

  return handler(req)
}

export { rateLimitedHandler as GET, rateLimitedHandler as POST }

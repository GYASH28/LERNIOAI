import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'

// Initialize NextAuth once at module load.
let handler: ((req: any, res: any) => any) | null = null
let initError: string | null = null

try {
  handler = NextAuth(authOptions)
} catch (err) {
  initError = err instanceof Error ? err.message : 'Unknown NextAuth init error'
  console.error('[nextauth] Initialization failed:', initError)
}

/**
 * NextAuth v4 route handler for Next.js 16 App Router.
 *
 * The challenge: next-auth v4 expects an Express-style (req, res) pair where
 * req.query contains the route params (like `nextauth: ['signin', 'google']`).
 * Next.js 16 route handlers receive (req: NextRequest, { params }).
 *
 * Solution: We construct a minimal req/res shim that gives next-auth what it
 * needs without trying to modify the immutable NextRequest object.
 */

interface RouteContext {
  params: Promise<{ nextauth: string[] }>
}

async function handleAuth(req: NextRequest, context: RouteContext) {
  if (!handler) {
    return NextResponse.json(
      { error: 'Auth service unavailable', detail: initError },
      { status: 503 },
    )
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'

  // Rate limiting (non-blocking)
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
    // DB unavailable — skip rate limiting
  }

  // Get the nextauth route params (e.g., ['signin', 'google'])
  const { nextauth } = await context.params

  // Parse query params from the URL
  const url = new URL(req.url)
  const query: Record<string, any> = { nextauth }
  url.searchParams.forEach((value, key) => {
    if (key in query) {
      const existing = query[key]
      query[key] = Array.isArray(existing) ? [...existing, value] : [existing, value]
    } else {
      query[key] = value
    }
  })

  // Read body for POST requests
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
      } else {
        body = {}
      }
    } catch {
      body = {}
    }
  }

  // Convert Headers to a plain object
  const headersObj: Record<string, string> = {}
  req.headers.forEach((value, key) => {
    headersObj[key] = value
  })

  // Create a request-like object that next-auth v4 can consume
  const reqShim = {
    url: req.url,
    method: req.method,
    headers: headersObj,
    query,
    body,
    cookies: Object.fromEntries(
      req.cookies.getAll().map((c) => [c.name, c.value])
    ),
  }

  // Create a response-like object that captures what next-auth writes to it
  const headers = new Map<string, string[]>()
  const cookies: Array<{ name: string; value: string; options: any }> = []
  let responseStatus = 200
  let responseBody: any = null

  const resShim = {
    getHeader: (name: string) => headers.get(name.toLowerCase())?.[0],
    setHeader: (name: string, value: string | string[]) => {
      headers.set(name.toLowerCase(), Array.isArray(value) ? value : [value])
    },
    status: (code: number) => {
      responseStatus = code
      return resShim
    },
    json: (data: any) => {
      responseBody = data
      return resShim
    },
    send: (data?: any) => {
      if (data !== undefined) responseBody = data
      return resShim
    },
    end: (data?: any) => {
      if (data !== undefined) responseBody = data
      return resShim
    },
    write: (data?: any) => {
      if (data !== undefined) responseBody = data
      return resShim
    },
    redirect: (statusOrUrl: number | string, url?: string) => {
      // Handle both redirect(url) and redirect(status, url)
      const redirectUrl = typeof statusOrUrl === 'string' ? statusOrUrl : url || ''
      if (redirectUrl) {
        headers.set('location', [redirectUrl])
      }
      if (typeof statusOrUrl === 'number') {
        responseStatus = statusOrUrl
      } else {
        responseStatus = 302
      }
      return resShim
    },
    cookie: (name: string, value: string, options: any) => {
      cookies.push({ name, value, options })
    },
    clearCookie: (name: string, options?: any) => {
      cookies.push({ name, value: '', options: { ...options, maxAge: 0 } })
    },
    finished: false,
    headersSent: false,
  }

  try {
    // Call next-auth's handler with our shimmed req/res
    await handler(reqShim, resShim)

    // Build the NextResponse from what next-auth wrote to resShim

    // Check for redirect (Location header)
    const location = headers.get('location')?.[0]
    if (location) {
      const response = NextResponse.redirect(location, { status: 302 })
      // Copy cookies
      for (const cookie of cookies) {
        response.cookies.set(cookie.name, cookie.value, cookie.options || {})
      }
      // Copy other headers
      for (const [key, values] of headers) {
        if (key !== 'location') {
          for (const v of values) {
            response.headers.append(key, v)
          }
        }
      }
      return response
    }

    // JSON or other response
    const response = NextResponse.json(responseBody ?? '', { status: responseStatus })

    // Copy cookies
    for (const cookie of cookies) {
      response.cookies.set(cookie.name, cookie.value, cookie.options || {})
    }

    // Copy headers
    for (const [key, values] of headers) {
      if (key !== 'location') {
        for (const v of values) {
          response.headers.append(key, v)
        }
      }
    }

    return response
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown auth handler error'
    console.error('[nextauth] Handler error:', message)
    return NextResponse.json(
      { error: 'Auth handler error', detail: message },
      { status: 500 },
    )
  }
}

export { handleAuth as GET, handleAuth as POST }

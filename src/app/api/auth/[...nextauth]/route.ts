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

  // Get the nextauth route params
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

  // Response state captured by the res proxy
  const resHeaders = new Map<string, string[]>()
  const resCookies: Array<{ name: string; value: string; options: any }> = []
  let responseStatus = 200
  let responseBody: any = null

  // Create a response proxy that catches ALL method calls
  // next-auth v4 calls many methods (send, json, end, status, redirect,
  // setHeader, getHeader, cookie, clearCookie, write, etc.)
  // Using a Proxy ensures we never miss a method.
  const resShim = new Proxy({} as any, {
    get(_target, prop: string) {
      // Return actual values for state properties
      if (prop === 'finished') return false
      if (prop === 'headersSent') return false
      if (prop === 'statusCode') return responseStatus

      // Return functions for all method calls
      return (...args: any[]) => {
        const method = prop

        if (method === 'getHeader') {
          return resHeaders.get(String(args[0]).toLowerCase())?.[0]
        }
        if (method === 'setHeader' || method === 'header') {
          const name = String(args[0]).toLowerCase()
          const value = args[1]
          resHeaders.set(name, Array.isArray(value) ? value : [String(value)])
          return resShim
        }
        if (method === 'status') {
          responseStatus = args[0]
          return resShim
        }
        if (method === 'json') {
          responseBody = args[0]
          return resShim
        }
        if (method === 'send' || method === 'end' || method === 'write') {
          if (args[0] !== undefined) responseBody = args[0]
          return resShim
        }
        if (method === 'redirect') {
          // Handle redirect(url) and redirect(status, url)
          if (typeof args[0] === 'number') {
            responseStatus = args[0]
            if (args[1]) resHeaders.set('location', [args[1]])
          } else if (args[0]) {
            responseStatus = 302
            resHeaders.set('location', [args[0]])
          }
          return resShim
        }
        if (method === 'cookie') {
          resCookies.push({ name: args[0], value: args[1], options: args[2] || {} })
          return resShim
        }
        if (method === 'clearCookie') {
          resCookies.push({ name: args[0], value: '', options: { ...(args[1] || {}), maxAge: 0 } })
          return resShim
        }
        if (method === 'get') {
          return resHeaders.get(String(args[0]).toLowerCase())?.[0]
        }
        if (method === 'set') {
          const name = String(args[0]).toLowerCase()
          resHeaders.set(name, [String(args[1])])
          return resShim
        }
        if (method === 'remove') {
          resHeaders.delete(String(args[0]).toLowerCase())
          return resShim
        }
        if (method === 'has') {
          return resHeaders.has(String(args[0]).toLowerCase())
        }
        // Unknown method — return the shim for chaining, ignore the call
        return resShim
      }
    },
    set(_target, prop: string, value: any) {
      if (prop === 'statusCode' || prop === 'status') {
        responseStatus = value
      }
      return true
    },
  })

  // Create the request shim
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

  try {
    // Call next-auth's handler with our shimmed req/res
    await handler(reqShim, resShim)

    // Build the NextResponse from captured state

    // Check for redirect (Location header)
    const location = resHeaders.get('location')?.[0]
    if (location) {
      const response = NextResponse.redirect(location, { status: responseStatus || 302 })
      // Copy cookies
      for (const cookie of resCookies) {
        response.cookies.set(cookie.name, cookie.value, cookie.options || {})
      }
      // Copy other headers (except location, already handled by redirect)
      for (const [key, values] of resHeaders) {
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
    for (const cookie of resCookies) {
      response.cookies.set(cookie.name, cookie.value, cookie.options || {})
    }

    // Copy headers
    for (const [key, values] of resHeaders) {
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

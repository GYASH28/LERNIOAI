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

  // Response state
  const resHeaders = new Map<string, string[]>()
  const resCookies: Array<{ name: string; value: string; options: any }> = []
  let responseStatus = 200
  let responseBody: any = null

  // Create a response proxy that catches ALL method calls
  const resShim = new Proxy({} as any, {
    get(_target, prop: string) {
      if (prop === 'finished') return false
      if (prop === 'headersSent') return false
      if (prop === 'statusCode') return responseStatus

      return (...args: any[]) => {
        const method = prop

        if (method === 'getHeader' || method === 'get') {
          return resHeaders.get(String(args[0]).toLowerCase())?.[0]
        }
        if (method === 'setHeader' || method === 'header' || method === 'set') {
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
        if (method === 'remove') {
          resHeaders.delete(String(args[0]).toLowerCase())
          return resShim
        }
        if (method === 'has') {
          return resHeaders.has(String(args[0]).toLowerCase())
        }
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

  // Create a request proxy that wraps the real NextRequest
  // and adds the missing `query` and `body` properties.
  // Using a Proxy ensures next-auth can access ANY property on req
  // (url, method, headers, cookies, etc.) via the real NextRequest,
  // while also getting the `query` and `body` properties it expects.
  const reqShim = new Proxy(req as any, {
    get(target: any, prop: string) {
      // Return our shimmed query/body/cookies
      if (prop === 'query') return query
      if (prop === 'body') return body
      if (prop === 'cookies') {
        return Object.fromEntries(
          req.cookies.getAll().map((c) => [c.name, c.value])
        )
      }
      // For everything else, return the real NextRequest property
      const value = target[prop]
      if (typeof value === 'function') {
        return value.bind(target)
      }
      return value
    },
  })

  try {
    await handler(reqShim, resShim)

    // Build the NextResponse from captured state
    const location = resHeaders.get('location')?.[0]
    if (location) {
      const response = NextResponse.redirect(location, { status: responseStatus || 302 })
      for (const cookie of resCookies) {
        response.cookies.set(cookie.name, cookie.value, cookie.options || {})
      }
      for (const [key, values] of resHeaders) {
        if (key !== 'location') {
          for (const v of values) {
            response.headers.append(key, v)
          }
        }
      }
      return response
    }

    // JSON or text response
    // Use new Response instead of NextResponse.json because responseBody
    // may already be a JSON string (from res.end(JSON.stringify(...)))
    const bodyStr = responseBody ?? ''
    const response = new Response(bodyStr, {
      status: responseStatus,
      headers: { 'content-type': 'application/json' },
    })
    // Copy cookies
    for (const cookie of resCookies) {
      response.headers.append(
        'set-cookie',
        `${cookie.name}=${cookie.value}; Path=/; HttpOnly; SameSite=Lax${
          cookie.options?.maxAge !== undefined ? `; Max-Age=${cookie.options.maxAge}` : ''
        }${cookie.options?.secure ? '; Secure' : ''}`
      )
    }
    for (const [key, values] of resHeaders) {
      if (key !== 'location' && key !== 'set-cookie') {
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

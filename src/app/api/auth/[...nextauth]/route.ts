import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

const handler = NextAuth(authOptions)

interface RouteContext {
  params: Promise<{ nextauth: string[] }>
}

async function handleAuth(req: NextRequest, context: RouteContext) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'

  // Rate limiting — wrapped in try/catch so DB issues never block auth
  try {
    const { checkRateLimit } = await import('@/lib/rate-limit')
    const globalLimit = await checkRateLimit({
      action: 'auth_global',
      identifier: ip,
      limit: 60,
      windowMs: 60 * 1000,
    })
    if (!globalLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
  } catch {}

  // Get route params (nextauth: ['csrf'], ['providers'], ['callback', 'credentials'], etc.)
  const { nextauth } = await context.params

  // Parse query from URL
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

  // Read body for POST
  let body: any = undefined
  if (req.method === 'POST') {
    try {
      const contentType = req.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        body = await req.json()
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const text = await req.text()
        body = Object.fromEntries(new URLSearchParams(text).entries())
      } else {
        body = {}
      }
    } catch {
      body = {}
    }
  }

  // Convert headers to plain object
  const headersObj: Record<string, string> = {}
  req.headers.forEach((value, key) => {
    headersObj[key] = value
  })

  // Response state
  const resHeaders = new Map<string, string[]>()
  const resCookies: Array<{ name: string; value: string; options: any }> = []
  let responseStatus = 200
  let responseBody: any = null

  // Response proxy — catches ALL method calls from next-auth v4
  const resShim = new Proxy({} as any, {
    get(_target: any, prop: string) {
      if (prop === 'finished') return false
      if (prop === 'headersSent') return false
      if (prop === 'statusCode') return responseStatus
      if (prop === 'cookies') return resCookies

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
          responseBody = typeof args[0] === 'string' ? args[0] : JSON.stringify(args[0])
          return resShim
        }
        if (method === 'send' || method === 'end' || method === 'write') {
          if (args[0] !== undefined && args[0] !== null) {
            responseBody = typeof args[0] === 'string' ? args[0] : JSON.stringify(args[0])
          }
          return resShim
        }
        if (method === 'redirect') {
          if (typeof args[0] === 'number') {
            responseStatus = args[0]
            if (args[1]) resHeaders.set('location', [args[1]])
          } else if (args[0]) {
            responseStatus = 302
            resHeaders.set('location', [String(args[0])])
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
        // Unknown method — return shim for chaining
        return resShim
      }
    },
    set(_target: any, prop: string, value: any) {
      if (prop === 'statusCode' || prop === 'status') {
        responseStatus = value
      }
      return true
    },
  })

  // Request shim — plain object with all properties next-auth v4 expects
  const reqShim = {
    url: req.url,
    method: req.method,
    headers: headersObj,
    query,
    body,
    cookies: Object.fromEntries(req.cookies.getAll().map((c) => [c.name, c.value])),
  }

  try {
    await handler(reqShim, resShim)

    // Check for redirect
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
    const response = NextResponse.json(responseBody ?? '', { status: responseStatus })
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
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown auth error'
    console.error('[nextauth] Error:', message)
    return NextResponse.json(
      { error: 'Auth handler error', detail: message },
      { status: 500 },
    )
  }
}

export { handleAuth as GET, handleAuth as POST }

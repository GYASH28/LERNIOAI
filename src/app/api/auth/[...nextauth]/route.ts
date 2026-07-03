import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

const handler = NextAuth(authOptions)

interface RouteContext {
  params: Promise<{ nextauth: string[] }>
}

async function handleAuth(req: NextRequest, context: RouteContext) {
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
  const resHeaders: Record<string, string | string[]> = {}
  const resCookies: Array<{ name: string; value: string; options: any }> = []
  let responseStatus = 200
  let responseChunks: Buffer[] = []

  // Express-like response object
  const res = {
    getHeader: (name: string) => resHeaders[name.toLowerCase()],
    setHeader: (name: string, value: string | string[]) => {
      resHeaders[name.toLowerCase()] = value
    },
    status: (code: number) => {
      responseStatus = code
      return res
    },
    json: (data: any) => {
      responseChunks.push(Buffer.from(JSON.stringify(data)))
      return res
    },
    send: (data: any) => {
      if (typeof data === 'string') {
        responseChunks.push(Buffer.from(data))
      } else if (Buffer.isBuffer(data)) {
        responseChunks.push(data)
      } else {
        responseChunks.push(Buffer.from(JSON.stringify(data)))
      }
      return res
    },
    end: (data?: any) => {
      if (data !== undefined && data !== null) {
        if (typeof data === 'string') {
          responseChunks.push(Buffer.from(data))
        } else {
          responseChunks.push(Buffer.from(JSON.stringify(data)))
        }
      }
      return res
    },
    write: (data: any) => {
      if (data !== undefined && data !== null) {
        if (typeof data === 'string') {
          responseChunks.push(Buffer.from(data))
        } else {
          responseChunks.push(Buffer.from(data))
        }
      }
      return res
    },
    redirect: (statusOrUrl: number | string, url?: string) => {
      if (typeof statusOrUrl === 'number') {
        responseStatus = statusOrUrl
        if (url) resHeaders['location'] = url
      } else {
        responseStatus = 302
        resHeaders['location'] = statusOrUrl
      }
      return res
    },
    cookie: (name: string, value: string, options: any) => {
      resCookies.push({ name, value, options })
      return res
    },
    clearCookie: (name: string, options?: any) => {
      resCookies.push({ name, value: '', options: { ...options, maxAge: 0 } })
      return res
    },
    finished: false,
    headersSent: false,
    statusCode: 200,
  }

  // Request object
  const reqObj = {
    url: req.url,
    method: req.method,
    headers: headersObj,
    query,
    body,
    cookies: Object.fromEntries(req.cookies.getAll().map((c) => [c.name, c.value])),
  }

  try {
    await handler(reqObj, res)

    // Combine response chunks
    const bodyBuffer = Buffer.concat(responseChunks)
    const bodyStr = bodyBuffer.toString('utf-8')

    // Check for redirect
    const location = resHeaders['location'] as string
    if (location) {
      const response = NextResponse.redirect(location, { status: responseStatus || 302 })
      for (const cookie of resCookies) {
        response.cookies.set(cookie.name, cookie.value, cookie.options || {})
      }
      return response
    }

    // Return response
    const response = new NextResponse(bodyStr, {
      status: responseStatus,
      headers: { 'content-type': 'application/json' },
    })
    for (const cookie of resCookies) {
      response.cookies.set(cookie.name, cookie.value, cookie.options || {})
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

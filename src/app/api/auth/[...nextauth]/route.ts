import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

const authHandler = NextAuth(authOptions)

interface RouteContext {
  params: Promise<{ nextauth: string[] }>
}

async function handleAuth(req: NextRequest, context: RouteContext) {
  try {
    // NextAuth v4 on Next.js 16: the handler returns a Response object
    // when called with a NextRequest. We just need to pass the route params.
    const { nextauth } = await context.params

    // Build a URL with the nextauth params in the pathname
    const url = new URL(req.url)
    url.pathname = `/api/auth/${nextauth.join('/')}`

    // Create a new Request with the updated URL
    const newReq = new Request(url.toString(), {
      method: req.method,
      headers: req.headers,
      body: req.method === 'POST' ? await req.text().catch(() => undefined) : undefined,
    })

    // Call NextAuth — it should return a Response
    const response = await authHandler(newReq as any)

    // If it's already a Response, return it directly
    if (response instanceof Response) {
      return response
    }

    // If it returned something else, wrap it
    return NextResponse.json(response)
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

import { withAuth } from 'next-auth/middleware'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { isProductionRuntime } from '@/lib/auth-policy'
import { buildContentSecurityPolicy } from '@/lib/security/content-security-policy'

function createNonce() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
}

function securedNext(req: NextRequest) {
  const nonce = createNonce()
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-nonce', nonce)
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  response.headers.set('Content-Security-Policy', buildProxyContentSecurityPolicy(nonce))
  response.headers.set('x-nonce', nonce)
  return response
}

function securedRedirect(url: URL) {
  const nonce = createNonce()
  const response = NextResponse.redirect(url)
  response.headers.set('Content-Security-Policy', buildProxyContentSecurityPolicy(nonce))
  return response
}

function buildProxyContentSecurityPolicy(nonce: string) {
  return buildContentSecurityPolicy({
    nonce,
    nodeEnv: process.env.NODE_ENV,
    storagePublicBaseUrl: process.env.STORAGE_PUBLIC_BASE_URL,
  })
}

const publicPaths = new Set([
  '/',
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/reset-password',
  '/privacy',
  '/terms',
  '/support',
])

export default withAuth(
  function proxy(req) {
    const pathname = req.nextUrl.pathname
    const token = req.nextauth.token

    if (token?.sessionRevoked === true || token?.status === 'revoked') {
      return securedRedirect(new URL('/sign-in', req.url))
    }

    if (
      token &&
      token.profileComplete === false &&
      pathname !== '/complete-profile' &&
      !publicPaths.has(pathname)
    ) {
      return securedRedirect(new URL('/complete-profile', req.url))
    }

    return securedNext(req)
  },
  {
    pages: {
      signIn: '/sign-in',
    },
    callbacks: {
      authorized: ({ token, req }) => {
        if (publicPaths.has(req.nextUrl.pathname)) return true
        if (
          process.env.LERNIO_DEMO_MODE === 'true' &&
          !isProductionRuntime({
            nodeEnv: process.env.NODE_ENV,
            vercelEnv: process.env.VERCEL_ENV,
          })
        ) {
          return true
        }
        return Boolean(token) && token?.sessionRevoked !== true && token?.status !== 'revoked'
      },
    },
  },
)

export const config = {
  matcher: [
    // Exclude from auth middleware:
    // - api/auth/*          (next-auth endpoints)
    // - api/academics/*     (public academic data)
    // - api/health          (liveness probe)
    // - api/ready           (readiness probe)
    // - api/youtube-thumbnail (public thumbnail proxy — needed on learn pages)
    // - api/quiz/generate   (public quiz generator — used by practice/exams)
    // - _next/static, _next/image, favicon.ico, brand/, etc. (static assets)
    '/((?!api/auth|api/academics|api/health|api/ready|api/youtube-thumbnail|api/quiz/generate|api/coding|api/firebase|_next/static|_next/image|favicon.ico|brand/|theme-no-flash.js|sw.js|robots.txt|sitemap.xml|manifest.webmanifest|lesson-notes).*)',
  ],
}

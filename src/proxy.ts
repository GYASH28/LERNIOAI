import { withAuth } from 'next-auth/middleware'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

function createNonce() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
}

function buildContentSecurityPolicy(nonce: string) {
  const scriptSrc =
    process.env.NODE_ENV === 'production'
      ? `'self' 'nonce-${nonce}'`
      : `'self' 'nonce-${nonce}' 'unsafe-eval'`

  return [
    `default-src 'self'`,
    `base-uri 'self'`,
    `object-src 'none'`,
    `frame-ancestors 'none'`,
    `form-action 'self'`,
    `script-src ${scriptSrc}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https:`,
    `font-src 'self' data:`,
    `connect-src 'self' https: wss:`,
    `media-src 'self' blob: data:`,
    `worker-src 'self' blob:`,
    `manifest-src 'self'`,
  ].join('; ')
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
  response.headers.set('Content-Security-Policy', buildContentSecurityPolicy(nonce))
  response.headers.set('x-nonce', nonce)
  return response
}

function securedRedirect(url: URL) {
  const nonce = createNonce()
  const response = NextResponse.redirect(url)
  response.headers.set('Content-Security-Policy', buildContentSecurityPolicy(nonce))
  return response
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
          process.env.NODE_ENV !== 'production' &&
          process.env.VERCEL_ENV !== 'production'
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
    '/((?!api/auth|api/academics|api/health|api/ready|_next/static|_next/image|favicon.ico|brand/|theme-no-flash.js|robots.txt|sitemap.xml|manifest.webmanifest).*)',
  ],
}

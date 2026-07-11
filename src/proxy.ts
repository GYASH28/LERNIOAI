import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { buildContentSecurityPolicy } from '@/lib/security/content-security-policy'

function createNonce() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
}

function buildProxyContentSecurityPolicy(nonce: string) {
  return buildContentSecurityPolicy({
    nonce,
    nodeEnv: process.env.NODE_ENV,
    storagePublicBaseUrl: process.env.STORAGE_PUBLIC_BASE_URL,
  })
}

/**
 * Lightweight middleware — only adds CSP headers.
 * Auth is handled by getCurrentUser() in each page component.
 * No withAuth redirect (which caused the 'URL is malformed' error
 * because next-auth v4 uses relative URLs for redirects).
 */
export function proxy(req: NextRequest) {
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

export default proxy

export const config = {
  matcher: [
    // Exclude from middleware:
    // - api/*             (API routes handle their own auth)
    // - _next/static, _next/image, favicon.ico, brand/, etc. (static assets)
    '/((?!api|_next/static|_next/image|favicon.ico|brand/|theme-no-flash.js|sw.js|robots.txt|sitemap.xml|manifest.webmanifest|lesson-notes).*)',
  ],
}

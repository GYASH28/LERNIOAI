import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

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

    if (
      token &&
      token.profileComplete === false &&
      pathname !== '/complete-profile' &&
      !publicPaths.has(pathname)
    ) {
      return NextResponse.redirect(new URL('/complete-profile', req.url))
    }

    return NextResponse.next()
  },
  {
    pages: {
      signIn: '/sign-in',
    },
    callbacks: {
      authorized: ({ token, req }) => {
        if (publicPaths.has(req.nextUrl.pathname)) return true
        if (process.env.LERNIO_DEMO_MODE === 'true') return true
        return Boolean(token)
      },
    },
  },
)

export const config = {
  matcher: [
    '/((?!api/auth|api/academics|api/health|api/ready|_next/static|_next/image|favicon.ico|brand/|robots.txt|sitemap.xml|manifest.webmanifest).*)',
  ],
}

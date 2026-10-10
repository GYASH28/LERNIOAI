import type { NextRequest } from 'next/server'
import { resolveRuntimeAuthUrl } from '@/lib/auth-policy'

// Do not import next-auth or @/lib/auth statically here. NextAuth v4 may
// resolve NEXTAUTH_URL during module initialization. On Vercel the generated
// project domain is not the canonical login origin, even if the app works at
// lernioai.vercel.app. Initialize the environment first, then load NextAuth.
export const dynamic = 'force-dynamic'

type AuthRouteContext = { params: Promise<{ nextauth: string[] }> }

async function authHandler(request: NextRequest, context: AuthRouteContext) {
  const canonicalOrigin = resolveRuntimeAuthUrl({
    configuredUrl: process.env.NEXTAUTH_URL,
    appUrl: process.env.LERNIO_APP_URL,
    vercelEnv: process.env.VERCEL_ENV,
    vercelUrl: process.env.VERCEL_URL,
    vercelProjectProductionUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  })

  if (canonicalOrigin && process.env.NEXTAUTH_URL !== canonicalOrigin) {
    process.env.NEXTAUTH_URL = canonicalOrigin
  }

  // Import after choosing the canonical origin to avoid freezing the
  // obsolete Vercel project hostname in provider and callback URLs.
  const [{ default: NextAuth }, { authOptions }] = await Promise.all([
    import('next-auth'),
    import('@/lib/auth'),
  ])
  return NextAuth(authOptions)(request, context)
}

export { authHandler as GET, authHandler as POST }

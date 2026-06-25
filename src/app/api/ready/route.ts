import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isDatabaseUnavailableError } from '@/lib/api-error-policy'

/**
 * Readiness probe.
 *
 * Verifies that the process can actually serve real traffic by
 * checking the critical dependency: the database. Other optional
 * providers (AI, OAuth) are reported as `configured`/`unconfigured`
 * but never block readiness, because their absence is a degraded
 * but valid state.
 *
 * No secrets are leaked — we only report booleans and short labels.
 * Cheap enough for Vercel's deployment smoke test, but heavier than
 * `/api/health`, so don't poll at sub-second intervals.
 */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type ProviderState = 'configured' | 'unconfigured'

interface ReadinessReport {
  status: 'ready' | 'degraded' | 'unavailable'
  service: 'lernio-ai'
  time: string
  checks: {
    database: 'ok' | 'unavailable'
    auth: ProviderState
    ai: ProviderState
  }
  deployment: {
    demoMode: boolean
    nodeEnv: string
  }
}

function providerState(value: string | undefined): ProviderState {
  return value && value.trim().length > 0 ? 'configured' : 'unconfigured'
}

export async function GET() {
  let database: 'ok' | 'unavailable' = 'ok'

  try {
    // A trivial scalar query is the cheapest reachability check that
    // still proves the connection pool, credentials and schema are
    // all in working order. `findUnique` on a non-existent id returns
    // null without raising, so this doubles as a Prisma Client check.
    await db.user.findUnique({ where: { id: '__lernio_ready_probe__' }, select: { id: true } })
  } catch (err) {
    if (isDatabaseUnavailableError(err)) {
      database = 'unavailable'
    } else {
      // Any other Prisma error (e.g. relation missing, schema drift)
      // still means we are not ready to serve real traffic.
      database = 'unavailable'
    }
  }

  const auth: ProviderState = providerState(process.env.NEXTAUTH_SECRET)
  const ai: ProviderState = providerState(process.env.ZAI_API_KEY)

  const overall: ReadinessReport['status'] =
    database === 'unavailable' ? 'unavailable' : 'ready'

  const report: ReadinessReport = {
    status: overall,
    service: 'lernio-ai',
    time: new Date().toISOString(),
    checks: {
      database,
      auth,
      ai,
    },
    deployment: {
      demoMode: process.env.LERNIO_DEMO_MODE === 'true',
      nodeEnv: process.env.NODE_ENV ?? 'development',
    },
  }

  return NextResponse.json(report, {
    status: overall === 'ready' ? 200 : 503,
  })
}

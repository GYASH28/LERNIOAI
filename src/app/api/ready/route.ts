import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { canAttemptDatabase } from '@/lib/db-health'
import { isDatabaseUnavailableError } from '@/lib/api-error-policy'
import { isProductionRuntime } from '@/lib/auth-policy'

/**
 * Readiness probe.
 *
 * Verifies that the process can actually serve real traffic by
 * checking critical dependencies. In production, database and auth
 * configuration are hard requirements. AI/email can remain degraded
 * only because the product has explicit retry/error states for them.
 *
 * No secrets are leaked; we only report booleans and short labels.
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
    email: ProviderState
  }
}

function providerState(value: string | undefined): ProviderState {
  return value && value.trim().length > 0 ? 'configured' : 'unconfigured'
}

function emailProviderState(): ProviderState {
  return providerState(
    process.env.RESEND_API_KEY && process.env.EMAIL_FROM
      ? 'configured'
      : undefined,
  )
}

export async function GET() {
  let database: 'ok' | 'unavailable' = 'ok'

  try {
    if (!(await canAttemptDatabase())) {
      database = 'unavailable'
    } else {
      // A trivial scalar query is the cheapest reachability check that
      // still proves the connection pool, credentials and schema are
      // all in working order. `findUnique` on a non-existent id returns
      // null without raising, so this doubles as a Prisma Client check.
      await db.user.findUnique({ where: { id: '__lernio_ready_probe__' }, select: { id: true } })
    }
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
  const ai: ProviderState = providerState(process.env.GROQ_API_KEY)
  const email = emailProviderState()
  const production = isProductionRuntime({
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  })
  const productionAuthBroken = production && auth === 'unconfigured'
  const productionDemoBroken = production && process.env.LERNIO_DEMO_MODE === 'true'

  const overall: ReadinessReport['status'] =
    database === 'unavailable' || productionAuthBroken || productionDemoBroken
      ? 'unavailable'
      : auth === 'unconfigured' || ai === 'unconfigured' || email === 'unconfigured'
        ? 'degraded'
        : 'ready'

  const report: ReadinessReport = {
    status: overall,
    service: 'lernio-ai',
    time: new Date().toISOString(),
    checks: {
      database,
      auth,
      ai,
      email,
    },
  }

  return NextResponse.json(report, {
    status: overall === 'unavailable' ? 503 : 200,
  })
}

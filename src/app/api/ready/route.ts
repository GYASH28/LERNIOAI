import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { canAttemptDatabase } from '@/lib/db-health'
import { isDatabaseUnavailableError } from '@/lib/api-error-policy'
import { isProductionRuntime } from '@/lib/auth-policy'
import { getCurrentUser } from '@/lib/auth'

/**
 * Readiness probe.
 *
 * Verifies that the process can actually serve real traffic by checking database.
 * Does not leak internal provider configurations to public, unauthenticated clients.
 */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type ProviderState = 'configured' | 'unconfigured'

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

export async function GET(req: Request) {
  let database: 'ok' | 'unavailable' = 'ok'

  try {
    if (!(await canAttemptDatabase())) {
      database = 'unavailable'
    } else {
      await db.user.findUnique({ where: { id: '__lernio_ready_probe__' }, select: { id: true } })
    }
  } catch (err) {
    database = 'unavailable'
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

  const overall =
    database === 'unavailable' || productionAuthBroken || productionDemoBroken
      ? 'unavailable'
      : 'ready'

  // Check auth to see if we should show the detailed report
  let showDetailed = false
  const authHeader = req.headers.get('authorization')
  if (authHeader && process.env.READINESS_TOKEN && authHeader === `Bearer ${process.env.READINESS_TOKEN}`) {
    showDetailed = true
  } else {
    try {
      const user = await getCurrentUser()
      if (user?.role === 'admin') {
        showDetailed = true
      }
    } catch {
      // Ignore auth errors
    }
  }

  if (showDetailed) {
    const detailedOverall =
      database === 'unavailable' || productionAuthBroken || productionDemoBroken
        ? 'unavailable'
        : auth === 'unconfigured' || ai === 'unconfigured' || email === 'unconfigured'
          ? 'degraded'
          : 'ready'

    return NextResponse.json({
      status: detailedOverall,
      service: 'lernio-ai',
      time: new Date().toISOString(),
      checks: {
        database,
        auth,
        ai,
        email,
      },
    }, {
      status: detailedOverall === 'unavailable' ? 503 : 200,
    })
  }

  return NextResponse.json(
    { ok: overall === 'ready' },
    { status: overall === 'unavailable' ? 503 : 200 }
  )
}

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { canAttemptDatabase } from '@/lib/db-health'
import { isProductionRuntime } from '@/lib/auth-policy'
import { getCurrentUser } from '@/lib/auth'

/**
 * Readiness probe.
 *
 * Verifies both database connectivity and the critical schema used by the
 * learning-state APIs. Public callers receive a minimal response; an admin or
 * bearer-token caller receives the detailed provider report.
 */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type ProviderState = 'configured' | 'unconfigured'
type SchemaState = 'ok' | 'out_of_date' | 'unknown'

interface CriticalSchemaRow {
  student_state_record: string | null
  learning_event: string | null
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

async function checkCriticalSchema(): Promise<SchemaState> {
  const rows = await db.$queryRaw<CriticalSchemaRow[]>`
    SELECT
      to_regclass('public."StudentStateRecord"')::text AS student_state_record,
      to_regclass('public."LearningEvent"')::text AS learning_event
  `
  const row = rows[0]
  return row?.student_state_record && row.learning_event ? 'ok' : 'out_of_date'
}

export async function GET(req: Request) {
  let database: 'ok' | 'unavailable' = 'ok'
  let schema: SchemaState = 'unknown'

  try {
    if (!(await canAttemptDatabase())) {
      database = 'unavailable'
    } else {
      await db.user.findUnique({
        where: { id: '__lernio_ready_probe__' },
        select: { id: true },
      })
      schema = await checkCriticalSchema()
    }
  } catch {
    database = 'unavailable'
  }

  const auth: ProviderState = providerState(process.env.NEXTAUTH_SECRET)
  const groq: ProviderState = providerState(process.env.GROQ_API_KEY)
  const gemini: ProviderState = providerState(process.env.GEMINI_API_KEY)
  const ai: ProviderState =
    groq === 'configured' || gemini === 'configured'
      ? 'configured'
      : 'unconfigured'
  const email = emailProviderState()
  const production = isProductionRuntime({
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  })
  const productionAuthBroken = production && auth === 'unconfigured'
  const productionDemoBroken =
    production && process.env.LERNIO_DEMO_MODE === 'true'
  const schemaBroken = schema === 'out_of_date'

  const unavailable =
    database === 'unavailable' ||
    schemaBroken ||
    productionAuthBroken ||
    productionDemoBroken

  let showDetailed = false
  const authHeader = req.headers.get('authorization')
  if (
    authHeader &&
    process.env.READINESS_TOKEN &&
    authHeader === `Bearer ${process.env.READINESS_TOKEN}`
  ) {
    showDetailed = true
  } else {
    try {
      const user = await getCurrentUser()
      showDetailed = user?.role === 'admin'
    } catch {
      showDetailed = false
    }
  }

  if (showDetailed) {
    const detailedOverall = unavailable
      ? 'unavailable'
      : auth === 'unconfigured' ||
          ai === 'unconfigured' ||
          email === 'unconfigured'
        ? 'degraded'
        : 'ready'

    return NextResponse.json(
      {
        status: detailedOverall,
        service: 'lernio-ai',
        time: new Date().toISOString(),
        checks: {
          database,
          schema,
          auth,
          ai,
          groq,
          gemini,
          email,
        },
      },
      { status: detailedOverall === 'unavailable' ? 503 : 200 },
    )
  }

  return NextResponse.json(
    { ok: !unavailable },
    { status: unavailable ? 503 : 200 },
  )
}

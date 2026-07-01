import { NextResponse } from 'next/server'

/**
 * Liveness probe.
 *
 * Returns 200 as soon as the Next.js process is able to handle a
 * request. Deliberately cheap — no database, no auth, no external
 * calls — so it can be polled frequently by orchestrators (Vercel
 * cron, uptime monitors, container healthchecks).
 *
 * For a deeper check that verifies critical dependencies, use
 * `/api/ready` instead.
 */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      service: 'lernio-ai',
      time: new Date().toISOString(),
    },
    { status: 200 },
  )
}

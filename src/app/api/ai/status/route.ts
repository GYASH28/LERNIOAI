import { NextResponse } from 'next/server'
import { requireUser, withApi } from '@/lib/auth'
import { getGroqRuntimeStatus } from '@/lib/ai/groq-stream'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  return withApi(async () => {
    await requireUser()
    const runtime = getGroqRuntimeStatus()

    return NextResponse.json(
      {
        ok: true,
        data: {
          available: runtime.configured,
          status: runtime.configured ? 'online' : 'not_configured',
          streaming: true,
          voice: runtime.configured,
          models: {
            quality: runtime.qualityModel,
            fast: runtime.fastModel,
          },
        },
        requestId: crypto.randomUUID(),
      },
      {
        headers: {
          'Cache-Control': 'private, no-store',
        },
      },
    )
  })
}

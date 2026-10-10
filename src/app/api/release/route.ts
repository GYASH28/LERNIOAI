import { NextResponse } from 'next/server'
import { getReleaseInfo } from '@/lib/release-info'

// Public, read-only status for detecting deployment skew. Never return secrets.
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(getReleaseInfo(process.env), {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}

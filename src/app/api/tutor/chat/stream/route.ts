import { NextRequest } from 'next/server'
import { handleTutorStream } from '@/lib/ai/tutor-stream-compatible'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  return handleTutorStream(req)
}

import { NextResponse } from 'next/server'
import { requireUser, withApi, ApiError } from '@/lib/auth'
import ZAI from 'z-ai-web-dev-sdk'

/**
 * POST /api/tutor/voice
 *
 * Speech-to-text endpoint for the AI Tutor voice input.
 * Accepts a base64-encoded audio blob (recorded in the browser via the
 * MediaRecorder API) and returns the transcribed text.
 *
 * Request body:
 *   {
 *     audio: string,        // base64-encoded audio (without data: prefix)
 *     mimeType?: string,    // e.g. 'audio/webm', 'audio/wav' (default 'audio/webm')
 *   }
 *
 * Response:
 *   { ok: true, data: { text: string } }
 *
 * Notes:
 *   - z-ai-web-dev-sdk is server-only by contract; this route is the single
 *     boundary between the browser mic and the ASR model.
 *   - We strip a leading `data:audio/...;base64,` prefix if the client sent it.
 *   - Audio size is capped at 8 MB to keep requests bounded.
 */
export async function POST(req: Request) {
  return withApi(async () => {
    const user = await requireUser()

    let json: { audio?: string; mimeType?: string }
    try {
      json = await req.json()
    } catch {
      throw new ApiError('BAD_REQUEST', 'Invalid JSON body.', 400, false)
    }

    const raw = json.audio
    if (!raw || typeof raw !== 'string') {
      throw new ApiError('BAD_REQUEST', 'Missing audio payload.', 400, false)
    }

    // Strip optional data-URL prefix
    const base64 = raw.startsWith('data:')
      ? raw.slice(raw.indexOf(',') + 1)
      : raw

    // ~8 MB cap
    if (base64.length > 11_000_000) {
      throw new ApiError(
        'AUDIO_TOO_LARGE',
        'Recording is too long. Please keep voice notes under 60 seconds.',
        413,
        false,
      )
    }

    try {
      const zai = await ZAI.create()
      const response = await zai.audio.asr.create({ file_base64: base64 })
      const text = (response?.text ?? '').trim()
      if (!text) {
        throw new ApiError(
          'ASR_EMPTY',
          'I could not hear you clearly — try speaking closer to the mic.',
          422,
          false,
        )
      }
      return NextResponse.json({ ok: true, data: { text } })
    } catch (err) {
      if (err instanceof ApiError) throw err
      console.error('[tutor/voice] ASR error for user', user.id, err)
      throw new ApiError(
        'ASR_FAILED',
        'Speech recognition failed. Please try again or type your message.',
        502,
        true,
      )
    }
  })
}

/** GET health probe used by the voice UI to confirm the endpoint exists. */
export async function GET() {
  return NextResponse.json({ ok: true, data: { mode: 'asr' } })
}

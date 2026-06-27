import { NextResponse } from 'next/server'
import { requireUser, withApi, ApiError } from '@/lib/auth'
import { getAiProvider } from '@/lib/ai/provider'
import { checkRateLimit } from '@/lib/rate-limit'
import { assertRequestBodySize } from '@/lib/schemas'

/**
 * POST /api/tutor/speak
 *
 * Text-to-speech endpoint for the AI Tutor. Generates a WAV audio buffer
 * for the given text and streams it back as audio/wav.
 *
 * Request body:
 *   {
 *     text: string,                 // 1..1024 chars (API limit)
 *     voice?: string,               // hannah | autumn | diana | austin | daniel | troy
 *     speed?: number,               // 0.5..2.0 (default 1.0)
 *   }
 *
 * Response:
 *   audio/wav binary on success
 *
 * Notes:
 *   - TTS input is capped at 1024 chars per request (API constraint). The
 *     client is expected to chunk longer assistant messages itself; we still
 *     defend server-side by truncating to 1000 chars.
 *   - Voices list mirrors the active Groq TTS provider.
 */
const ALLOWED_VOICES = new Set(['hannah', 'autumn', 'diana', 'austin', 'daniel', 'troy'])

export async function POST(req: Request) {
  return withApi(async () => {
    assertRequestBodySize(req, 16 * 1024)

    const user = await requireUser()
    const limiter = await checkRateLimit({
      action: 'ai_tutor_tts',
      identifier: user.id,
      limit: 60,
      windowMs: 60 * 60 * 1000,
    })
    if (!limiter.allowed) {
      throw new ApiError('RATE_LIMITED', `Too many voice requests. Try again in ${limiter.retryAfterSec} seconds.`, 429, true)
    }

    let json: { text?: string; voice?: string; speed?: number }
    try {
      json = await req.json()
    } catch {
      throw new ApiError('BAD_REQUEST', 'Invalid JSON body.', 400, false)
    }

    const rawText = (json.text ?? '').trim()
    if (!rawText) {
      throw new ApiError('BAD_REQUEST', 'Text is required.', 400, false)
    }
    // Cap to 1000 chars (API hard limit is 1024). Strip markdown noise a bit
    // to make the spoken version more natural.
    const cleaned = rawText
      .replace(/```[\s\S]*?```/g, ' (code block) ') // collapse code fences
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*_#>]+/g, ' ')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1000)

    if (!cleaned) {
      throw new ApiError('BAD_REQUEST', 'Nothing to speak after cleaning.', 400, false)
    }

    const voice = json.voice && ALLOWED_VOICES.has(json.voice) ? json.voice : 'hannah'
    let speed = typeof json.speed === 'number' ? json.speed : 1.0
    if (speed < 0.5) speed = 0.5
    if (speed > 2.0) speed = 2.0

    try {
      const arrayBuffer = await getAiProvider().synthesizeSpeech({
        text: cleaned,
        voice,
        speed,
        signal: req.signal,
      })
      const buffer = Buffer.from(new Uint8Array(arrayBuffer))

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'audio/wav',
          'Content-Length': buffer.length.toString(),
          'Cache-Control': 'no-store, max-age=0',
        },
      })
    } catch (err) {
      console.error('[tutor/speak] TTS error:', err)
      throw new ApiError(
        'TTS_FAILED',
        'Voice synthesis failed. Please try again.',
        502,
        true,
      )
    }
  })
}

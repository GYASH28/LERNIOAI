import { describe, expect, it } from 'vitest'
import { consumeTutorStream, encodeTutorStreamEvent, type TutorStreamEvent } from './stream-protocol'

function streamedResponse(chunks: string[]) {
  const encoder = new TextEncoder()
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
        controller.close()
      },
    }),
    { status: 200, headers: { 'Content-Type': 'application/x-ndjson' } },
  )
}

describe('tutor stream protocol', () => {
  it('decodes events even when a JSON line is split across network chunks', async () => {
    const events: TutorStreamEvent[] = [
      { type: 'meta', requestId: 'req-1', modelProfile: 'fast', startedAt: 1 },
      { type: 'delta', text: 'Hello ' },
      { type: 'delta', text: 'student' },
      {
        type: 'done',
        message: {
          id: 'm1',
          role: 'assistant',
          content: 'Hello student',
        },
        totalMs: 120,
        firstTokenMs: 40,
      },
    ]
    const payload = events.map(encodeTutorStreamEvent).join('')
    const seen: TutorStreamEvent[] = []

    await consumeTutorStream(
      streamedResponse([payload.slice(0, 17), payload.slice(17, 51), payload.slice(51)]),
      (event) => seen.push(event),
    )

    expect(seen).toEqual(events)
  })

  it('surfaces a safe JSON API error when a stream request fails before streaming', async () => {
    const response = new Response(
      JSON.stringify({ error: { message: 'LEO is not configured.' } }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    )

    await expect(consumeTutorStream(response, () => undefined)).rejects.toThrow(
      'LEO is not configured.',
    )
  })
})

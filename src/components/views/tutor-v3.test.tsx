import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TutorView } from './tutor-v3'
import { useAppStore } from '@/store/app-store'
import { encodeTutorStreamEvent } from '@/lib/ai/stream-protocol'

vi.mock('@/components/mascots/mascot', () => ({
  Mascot: ({ mascot }: { mascot: string }) => <div data-testid={`mascot-${mascot}`} />,
}))

vi.mock('@/hooks/use-tts-player', () => ({
  useTtsPlayer: () => ({
    playing: false,
    loading: false,
    error: null,
    play: vi.fn(),
    stop: vi.fn(),
  }),
}))

function streamResponse() {
  const encoder = new TextEncoder()
  const payload = [
    encodeTutorStreamEvent({
      type: 'meta',
      requestId: 'req-send-test',
      modelProfile: 'fast',
      startedAt: 1,
    }),
    encodeTutorStreamEvent({ type: 'delta', text: 'Here is your plan for today.' }),
    encodeTutorStreamEvent({
      type: 'done',
      message: {
        id: 'assistant-1',
        clientMessageId: 'client-1',
        role: 'assistant',
        content: 'Here is your plan for today.',
        mode: 'explain_simple',
        groundingStatus: 'general',
      },
      sessionTitle: 'Plan my work for today',
      firstTokenMs: 120,
      totalMs: 260,
    }),
  ].join('')

  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(payload))
        controller.close()
      },
    }),
    { status: 200, headers: { 'Content-Type': 'application/x-ndjson' } },
  )
}

describe('TutorView send flow', () => {
  beforeEach(() => {
    useAppStore.setState({ subjects: [] })
    Element.prototype.scrollIntoView = vi.fn()

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)

        if (url === '/api/tutor/session' && (!init?.method || init.method === 'GET')) {
          return Response.json({ ok: true, data: [] })
        }
        if (url === '/api/ai/status') {
          return Response.json({ ok: true, data: { available: true } })
        }
        if (url === '/api/tutor/session' && init?.method === 'POST') {
          return Response.json({
            ok: true,
            data: {
              id: 'session-1',
              title: 'New session',
              mode: 'explain_simple',
              language: 'en',
              archived: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              messages: [],
            },
          })
        }
        if (url === '/api/tutor/chat/stream') return streamResponse()

        throw new Error(`Unexpected fetch: ${url}`)
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
    useAppStore.setState({ subjects: [] })
  })

  it('creates the first session and sends when the Send button is clicked', async () => {
    const user = userEvent.setup()
    render(<TutorView />)

    const composer = await screen.findByPlaceholderText(/Ask LEO.*Explain Simply/i)
    await user.type(composer, 'Plan my work for today')
    await user.click(screen.getByRole('button', { name: /^Send$/i }))

    expect((await screen.findAllByText('Plan my work for today')).length).toBeGreaterThan(0)
    expect(await screen.findByText('Here is your plan for today.')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith(
      '/api/tutor/session',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(fetch).toHaveBeenCalledWith(
      '/api/tutor/chat/stream',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('shows a visible error instead of appearing dead when session creation fails', async () => {
    const mockedFetch = vi.mocked(fetch)
    mockedFetch.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === '/api/tutor/session' && (!init?.method || init.method === 'GET')) {
        return Response.json({ ok: true, data: [] })
      }
      if (url === '/api/ai/status') {
        return Response.json({ ok: true, data: { available: true } })
      }
      if (url === '/api/tutor/session' && init?.method === 'POST') {
        return Response.json(
          { ok: false, error: { message: 'Database is temporarily unavailable.' } },
          { status: 503 },
        )
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    const user = userEvent.setup()
    render(<TutorView />)

    const composer = await screen.findByPlaceholderText(/Ask LEO.*Explain Simply/i)
    await user.type(composer, 'Explain arrays')
    await user.click(screen.getByRole('button', { name: /^Send$/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Database is temporarily unavailable.')
    expect(composer).toHaveValue('Explain arrays')
  })
})

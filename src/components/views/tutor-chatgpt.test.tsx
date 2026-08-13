import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TutorChatGPTWorkspace } from './tutor-chatgpt'
import { encodeTutorStreamEvent } from '@/lib/ai/stream-protocol'

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
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

describe('TutorChatGPTWorkspace', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn()
    window.localStorage.clear()

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
    window.localStorage.clear()
  })

  it('creates the first session and streams an answer from the composer', async () => {
    const user = userEvent.setup()
    render(<TutorChatGPTWorkspace userName="Yash" initialSubjects={[]} />)

    const composer = await screen.findByPlaceholderText('Message LEO')
    await user.type(composer, 'Plan my work for today')
    await user.click(screen.getByRole('button', { name: 'Send message' }))

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

  it('restores an unfinished draft without overwriting it during hydration', async () => {
    window.localStorage.setItem('lernio:leo:draft-v2', 'Explain database normalization')

    render(<TutorChatGPTWorkspace initialSubjects={[]} />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Message LEO')).toHaveValue('Explain database normalization')
    })
  })

  it('keeps the draft and shows a visible error when session creation fails', async () => {
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
    render(<TutorChatGPTWorkspace initialSubjects={[]} />)

    const composer = await screen.findByPlaceholderText('Message LEO')
    await user.type(composer, 'Explain arrays')
    await user.click(screen.getByRole('button', { name: 'Send message' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Database is temporarily unavailable.')
    expect(composer).toHaveValue('Explain arrays')
  })
})

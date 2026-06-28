import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TutorView } from './tutor-v2'
import { useAppStore } from '@/store/app-store'
import { encodeTutorStreamEvent } from '@/lib/ai/stream-protocol'

const playVoice = vi.fn(async () => undefined)
const stopVoice = vi.fn()

vi.mock('@/components/mascots/mascot', () => ({
  Mascot: ({ mascot }: { mascot: string }) => <div data-testid={`mascot-${mascot}`} />,
}))

vi.mock('@/hooks/use-tts-player', () => ({
  useTtsPlayer: () => ({
    playing: false,
    loading: false,
    error: null,
    play: playVoice,
    stop: stopVoice,
  }),
}))

function tutorStream(content = 'Arrays store elements in contiguous memory.') {
  const encoder = new TextEncoder()
  const events = [
    encodeTutorStreamEvent({
      type: 'meta',
      requestId: 'req-tutor',
      modelProfile: 'fast',
      startedAt: 1,
    }),
    encodeTutorStreamEvent({ type: 'delta', text: 'Arrays store elements ' }),
    encodeTutorStreamEvent({ type: 'delta', text: 'in contiguous memory.' }),
    encodeTutorStreamEvent({
      type: 'done',
      message: {
        id: `assistant-${Math.random()}`,
        clientMessageId: 'client-1',
        role: 'assistant',
        content,
        mode: 'explain_simple',
        groundingStatus: 'general',
        followUps: JSON.stringify(['Quiz me']),
      },
      sessionTitle: 'Explain arrays',
      firstTokenMs: 90,
      totalMs: 180,
    }),
  ]

  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(events.join('')))
        controller.close()
      },
    }),
    { status: 200, headers: { 'Content-Type': 'application/x-ndjson' } },
  )
}

describe('TutorView', () => {
  beforeEach(() => {
    useAppStore.setState({
      user: {
        id: 'u1',
        email: 'student@example.com',
        name: 'Student',
        role: 'student',
        preferredLang: 'en',
        dailyMins: 60,
        xp: 0,
        level: 1,
        streak: 0,
        onboarded: true,
      },
      subjects: [],
    })

    Element.prototype.scrollIntoView = vi.fn()
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn(async () => undefined) },
    })

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url === '/api/tutor/session' && (!init?.method || init.method === 'GET')) {
          return Response.json({
            ok: true,
            data: [
              {
                id: 'session-1',
                title: 'New session',
                mode: 'explain_simple',
                language: 'en',
                archived: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                messages: [],
              },
            ],
          })
        }
        if (url === '/api/ai/status') {
          return Response.json({
            ok: true,
            data: { available: true, status: 'online', streaming: true, voice: true },
          })
        }
        if (url === '/api/tutor/chat/stream') return tutorStream()
        if (url === '/api/tutor/session' && init?.method === 'POST') {
          return Response.json({
            ok: true,
            data: {
              id: 'session-2',
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
        if (url.startsWith('/api/tutor/session?') && init?.method === 'DELETE') {
          return Response.json({ ok: true, data: { deleted: true } })
        }
        throw new Error(`Unexpected fetch: ${url}`)
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
    useAppStore.setState({ user: null, subjects: [] })
  })

  it('streams an answer and keeps copy, voice, follow-up, new, and delete controls functional', async () => {
    const user = userEvent.setup()
    render(<TutorView />)

    expect(await screen.findByText('AI online')).toBeInTheDocument()

    const composer = screen.getByPlaceholderText(/Ask LEO in Explain Simply/i)
    await user.type(composer, 'Explain arrays')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(await screen.findByText(/Arrays store elements in contiguous memory/)).toBeInTheDocument()
    expect(screen.getByText(/First words 0.1s/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Copy response' }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'Arrays store elements in contiguous memory.',
    )

    await user.click(screen.getByRole('button', { name: 'Read response aloud' }))
    expect(playVoice).toHaveBeenCalledWith('Arrays store elements in contiguous memory.')

    await user.click(screen.getByRole('button', { name: 'Quiz me' }))
    await waitFor(() => {
      expect(screen.getAllByText(/Arrays store elements in contiguous memory/)).toHaveLength(2)
    })

    await user.click(screen.getByRole('button', { name: 'New conversation' }))
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Delete New session/i }).length).toBeGreaterThan(1)
    })

    const deleteButton = screen.getAllByRole('button', { name: /Delete New session/i })[0]
    await user.click(deleteButton)
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringMatching(/^\/api\/tutor\/session\?sessionId=/),
        expect.objectContaining({ method: 'DELETE' }),
      )
    })
  })
})

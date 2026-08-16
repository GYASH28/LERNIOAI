import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AiCopilot } from './ai-copilot'
import { useAppStore } from '@/store/app-store'
import { encodeTutorStreamEvent } from '@/lib/ai/stream-protocol'

function streamResponse() {
  const encoder = new TextEncoder()
  const events = [
    encodeTutorStreamEvent({
      type: 'meta',
      requestId: 'req-copilot',
      modelProfile: 'fast',
      startedAt: 1,
    }),
    encodeTutorStreamEvent({ type: 'delta', text: 'Study arrays for 20 minutes. ' }),
    encodeTutorStreamEvent({ type: 'delta', text: 'Finish with active recall.' }),
    encodeTutorStreamEvent({
      type: 'done',
      message: {
        id: 'action-1',
        role: 'assistant',
        content: 'Study arrays for 20 minutes. Finish with active recall.',
      },
      firstTokenMs: 80,
      totalMs: 160,
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

describe('AiCopilot', () => {
  beforeEach(() => {
    useAppStore.setState({
      view: 'dashboard',
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
      currentSubjectId: null,
      currentUnitNumber: null,
      currentTopicId: null,
      currentMode: 'learn',
      continueLearning: null,
    })
    vi.stubGlobal('fetch', vi.fn(async () => streamResponse()))
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    useAppStore.setState({ user: null, view: 'dashboard' })
  })

  it('opens, runs a contextual action, streams text, copies, expands, and closes', async () => {
    // userEvent installs a realistic clipboard stub. Spy on that installed API instead of
    // replacing navigator.clipboard before setup(), which userEvent itself overwrites.
    const user = userEvent.setup()
    const clipboardWrite = vi.spyOn(navigator.clipboard, 'writeText')
    render(<AiCopilot />)

    await user.click(screen.getByRole('button', { name: 'Open LEO copilot' }))
    expect(screen.getByRole('complementary', { name: 'LEO context copilot' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Plan next 30 minutes' }))

    expect(await screen.findByText(/Study arrays for 20 minutes/)).toBeInTheDocument()
    expect(screen.getByText(/First response in 0.1s/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Copy' }))
    expect(clipboardWrite).toHaveBeenCalledWith(
      'Study arrays for 20 minutes. Finish with active recall.',
    )
    expect(await screen.findByText('Copied')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Expand copilot' }))
    expect(screen.getByRole('button', { name: 'Restore copilot size' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close LEO copilot' }))
    await waitFor(() => {
      expect(screen.queryByRole('complementary', { name: 'LEO context copilot' })).not.toBeInTheDocument()
    })
  })
})

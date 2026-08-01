import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { YouTubePlayer } from './youtube-player'

vi.mock('sonner', () => ({ toast: { success: vi.fn() } }))

const videoId = 'dQw4w9WgXcQ'
const url = `https://www.youtube.com/watch?v=${videoId}`
const memoryKey = `lernio.video-memory.v1:${videoId}`

describe('YouTubePlayer', () => {
  beforeEach(() => window.localStorage.clear())

  it('restores resume position, speed and saved timestamps for the exact video', async () => {
    window.localStorage.setItem(memoryKey, JSON.stringify({
      resumeSeconds: 42,
      playbackRate: 1.5,
      bookmarks: [{ id: 'bookmark-1', seconds: 25, note: 'Review this step', createdAt: new Date().toISOString() }],
    }))

    const user = userEvent.setup()
    render(<YouTubePlayer url={url} title="Exact curriculum lesson" channel="Test channel" />)

    const playButton = await screen.findByRole('button', { name: 'Resume at 0:42: Exact curriculum lesson' })
    expect(screen.getByText('Review this step')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1.5×' })).toHaveClass('text-primary')

    await user.click(playButton)
    await waitFor(() => {
      expect(screen.getByTitle('Exact curriculum lesson')).toHaveAttribute('src', expect.stringContaining('start=42'))
    })
  })

  it('saves and removes a timestamp note without changing another video', async () => {
    const user = userEvent.setup()
    render(<YouTubePlayer url={url} title="Exact curriculum lesson" />)

    await screen.findByRole('button', { name: 'Play: Exact curriculum lesson' })
    await user.type(screen.getByPlaceholderText('Example: Rewatch the pointer explanation'), 'Important definition')
    await user.click(screen.getByRole('button', { name: 'Save timestamp' }))

    expect(screen.getByText('Important definition')).toBeInTheDocument()
    expect(JSON.parse(window.localStorage.getItem(memoryKey) || '{}').bookmarks).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Delete timestamp 0:00' }))
    expect(screen.queryByText('Important definition')).not.toBeInTheDocument()
    expect(JSON.parse(window.localStorage.getItem(memoryKey) || '{}').bookmarks).toHaveLength(0)
  })
})

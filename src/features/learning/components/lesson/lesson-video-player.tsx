'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'

interface LessonVideoPlayerProps {
  lessonId: string
  resourceId: string
  title: string
  embedUrl: string
  chapters?: Array<{
    id: string
    title: string
    startSeconds: number
    endSeconds: number | null
  }>
  initialLastSecond?: number | null
}

interface YouTubePlayer {
  seekTo(seconds: number, allowSeekAhead: boolean): void
  playVideo(): void
  getCurrentTime(): number
  getDuration(): number
  getPlayerState(): number
  destroy(): void
}

interface YouTubePlayerConstructor {
  new (
    element: HTMLIFrameElement,
    options: {
      events: {
        onReady?: () => void
        onStateChange?: (event: { data: number }) => void
      }
    },
  ): YouTubePlayer
}

declare global {
  interface Window {
    YT?: {
      Player?: YouTubePlayerConstructor
      PlayerState?: {
        ENDED: number
        PLAYING: number
        PAUSED: number
      }
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

let youtubeApiPromise: Promise<void> | null = null

export function LessonVideoPlayer({
  lessonId,
  resourceId,
  title,
  embedUrl,
  chapters = [],
  initialLastSecond = 0,
}: LessonVideoPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const playerRef = useRef<YouTubePlayer | null>(null)
  const lastSyncedSecondRef = useRef(0)

  const iframeSrc = useMemo(() => {
    const url = new URL(embedUrl)
    url.searchParams.set('enablejsapi', '1')
    url.searchParams.set('rel', '0')
    if (typeof window !== 'undefined') {
      url.searchParams.set('origin', window.location.origin)
    }
    return url.toString()
  }, [embedUrl])

  const syncProgress = useCallback(
    async (playerState: 'playing' | 'paused' | 'ended' | 'unknown' = 'unknown') => {
      const player = playerRef.current
      if (!player) return

      const lastSecond = Math.max(0, Math.floor(player.getCurrentTime() || 0))
      if (playerState !== 'ended' && Math.abs(lastSecond - lastSyncedSecondRef.current) < 10) return

      lastSyncedSecondRef.current = lastSecond

      await fetch('/api/progress/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          lessonId,
          resourceId,
          lastSecond,
          playerState,
        }),
      }).catch(() => undefined)
    },
    [lessonId, resourceId],
  )

  const seekToChapter = useCallback(
    (seconds: number) => {
      playerRef.current?.seekTo(seconds, true)
      playerRef.current?.playVideo()
      lastSyncedSecondRef.current = seconds
      void syncProgress('playing')
    },
    [syncProgress],
  )

  useEffect(() => {
    let disposed = false

    loadYouTubeApi().then(() => {
      if (disposed || !iframeRef.current || !window.YT?.Player) return

      playerRef.current = new window.YT.Player(iframeRef.current, {
        events: {
          onReady: () => {
            if (initialLastSecond && initialLastSecond > 5) {
              playerRef.current?.seekTo(initialLastSecond, true)
              lastSyncedSecondRef.current = initialLastSecond
            }
          },
          onStateChange: (event) => {
            if (event.data === window.YT?.PlayerState?.ENDED) {
              void syncProgress('ended')
            }
            if (event.data === window.YT?.PlayerState?.PAUSED) {
              void syncProgress('paused')
            }
          },
        },
      })
    })

    const interval = window.setInterval(() => {
      if (playerRef.current?.getPlayerState() === window.YT?.PlayerState?.PLAYING) {
        void syncProgress('playing')
      }
    }, 15000)

    return () => {
      disposed = true
      window.clearInterval(interval)
      void syncProgress('unknown')
      playerRef.current?.destroy()
      playerRef.current = null
    }
  }, [initialLastSecond, syncProgress])

  return (
    <div className="bg-black">
      <iframe
        ref={iframeRef}
        className="aspect-video w-full bg-black"
        src={iframeSrc}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
      {chapters.length > 0 ? (
        <div className="grid gap-2 border-t border-white/10 bg-background p-3 sm:grid-cols-2">
          {chapters.map((chapter) => (
            <button
              key={chapter.id}
              type="button"
              onClick={() => seekToChapter(chapter.startSeconds)}
              className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-muted"
            >
              <span className="truncate font-medium">{chapter.title}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{formatSeconds(chapter.startSeconds)}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function loadYouTubeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.YT?.Player) return Promise.resolve()

  if (!youtubeApiPromise) {
    youtubeApiPromise = new Promise((resolve) => {
      const previousReady = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        previousReady?.()
        resolve()
      }

      const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]')
      if (!existingScript) {
        const script = document.createElement('script')
        script.src = 'https://www.youtube.com/iframe_api'
        script.async = true
        document.head.appendChild(script)
      }
    })
  }

  return youtubeApiPromise
}

function formatSeconds(value: number): string {
  const safe = Math.max(0, Math.floor(value))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  BookmarkPlus,
  Check,
  Clock3,
  ExternalLink,
  Flag,
  Gauge,
  Loader2,
  Play,
  RotateCcw,
  Trash2,
  WifiOff,
  Youtube,
} from 'lucide-react'
import { toast } from 'sonner'
import { STUDENT_OS_STORAGE, type StudentLearningProfile } from '@/lib/student-os/catalog'
import { cn } from '@/lib/utils'

interface YouTubePlayerProps {
  url: string
  title: string
  channel?: string
  language?: string
  description?: string
  isPlaylist?: boolean
}

interface VideoBookmark {
  id: string
  seconds: number
  note: string
  createdAt: string
}

interface VideoMemory {
  resumeSeconds: number
  playbackRate: number
  bookmarks: VideoBookmark[]
}

const DEFAULT_MEMORY: VideoMemory = {
  resumeSeconds: 0,
  playbackRate: 1,
  bookmarks: [],
}

function extractPlaylistId(url: string): string | null {
  const match = url.match(/[?&]list=([\w-]+)/)
  return match ? match[1] : null
}

function extractVideoId(url: string): string | null {
  const watchMatch = url.match(/[?&]v=([\w-]{11})/)
  if (watchMatch) return watchMatch[1]
  const shortMatch = url.match(/youtu\.be\/([\w-]{11})/)
  if (shortMatch) return shortMatch[1]
  const embedMatch = url.match(/youtube(?:-nocookie)?\.com\/embed\/([\w-]{11})/)
  return embedMatch ? embedMatch[1] : null
}

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds || 0))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const remaining = safe % 60
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`
  return `${minutes}:${String(remaining).padStart(2, '0')}`
}

function readMemory(key: string): VideoMemory {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || 'null') as Partial<VideoMemory> | null
    if (!parsed) return DEFAULT_MEMORY
    return {
      resumeSeconds: typeof parsed.resumeSeconds === 'number' ? parsed.resumeSeconds : 0,
      playbackRate: typeof parsed.playbackRate === 'number' ? parsed.playbackRate : 1,
      bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks : [],
    }
  } catch {
    return DEFAULT_MEMORY
  }
}

function readLowDataPreference() {
  try {
    const profile = JSON.parse(window.localStorage.getItem(STUDENT_OS_STORAGE.profile) || 'null') as StudentLearningProfile | null
    return Boolean(profile?.lowBandwidth)
  } catch {
    return false
  }
}

export function YouTubePlayer({
  url,
  title,
  channel,
  language,
  description,
  isPlaylist,
}: YouTubePlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [playing, setPlaying] = useState(false)
  const [thumbnail, setThumbnail] = useState<string | null>(null)
  const [thumbLoaded, setThumbLoaded] = useState(false)
  const [thumbError, setThumbError] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [memory, setMemory] = useState<VideoMemory>(DEFAULT_MEMORY)
  const [memoryLoaded, setMemoryLoaded] = useState(false)
  const [bookmarkNote, setBookmarkNote] = useState('')
  const [startAt, setStartAt] = useState(0)
  const [playerKey, setPlayerKey] = useState(0)
  const [lowData, setLowData] = useState(false)

  const videoId = extractVideoId(url)
  const playlistId = extractPlaylistId(url)
  const resourceId = videoId || playlistId || url
  const memoryKey = useMemo(() => `lernio.video-memory.v1:${resourceId}`, [resourceId])

  useEffect(() => {
    const stored = readMemory(memoryKey)
    setMemory(stored)
    setStartAt(stored.resumeSeconds)
    setLowData(readLowDataPreference())
    setMemoryLoaded(true)
  }, [memoryKey])

  const persistMemory = useCallback((next: VideoMemory) => {
    setMemory(next)
    try {
      window.localStorage.setItem(memoryKey, JSON.stringify(next))
    } catch {
      // Video playback remains usable when storage is unavailable.
    }
  }, [memoryKey])

  useEffect(() => {
    if (videoId) {
      setThumbnail(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`)
      return
    }

    if (playlistId) {
      const cacheKey = `yt_thumb_${playlistId}`
      try {
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          setThumbnail(cached)
          return
        }
      } catch {
        // Continue to the proxied thumbnail request.
      }

      fetch(`/api/youtube-thumbnail?url=${encodeURIComponent(url)}`)
        .then((response) => response.json())
        .then((data: { thumbnail?: string }) => {
          if (!data.thumbnail) return
          setThumbnail(data.thumbnail)
          try {
            localStorage.setItem(cacheKey, data.thumbnail)
          } catch {
            // Ignore unavailable thumbnail cache.
          }
        })
        .catch(() => setThumbError(true))
      return
    }

    setThumbError(true)
  }, [playlistId, url, videoId])

  const buildEmbedUrl = useCallback(() => {
    const origin = typeof window === 'undefined' ? '' : `&origin=${encodeURIComponent(window.location.origin)}`
    const common = `rel=0&autoplay=1&enablejsapi=1&playsinline=1${origin}`
    const start = startAt > 0 ? `&start=${Math.floor(startAt)}` : ''
    if (isPlaylist && playlistId) {
      return `https://www.youtube-nocookie.com/embed/videoseries?list=${playlistId}&${common}${start}`
    }
    if (videoId) {
      return `https://www.youtube-nocookie.com/embed/${videoId}?${common}${start}`
    }
    return url
  }, [isPlaylist, playlistId, startAt, url, videoId])

  const sendCommand = useCallback((func: string, args: unknown[] = []) => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({
      event: 'command',
      func,
      args,
      id: 'lernio-player',
    }), '*')
  }, [])

  useEffect(() => {
    if (!playing) return

    const receive = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return
      if (!event.origin.includes('youtube.com') && !event.origin.includes('youtube-nocookie.com')) return

      let payload: unknown = event.data
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload)
        } catch {
          return
        }
      }
      if (!payload || typeof payload !== 'object') return
      const data = payload as { event?: string; info?: { currentTime?: number; duration?: number; playbackRate?: number } }
      if (data.event !== 'infoDelivery' || !data.info) return
      if (typeof data.info.currentTime === 'number') setCurrentTime(data.info.currentTime)
      if (typeof data.info.duration === 'number') setDuration(data.info.duration)
    }

    window.addEventListener('message', receive)
    const polling = window.setInterval(() => {
      sendCommand('getCurrentTime')
      sendCommand('getDuration')
    }, 1500)
    return () => {
      window.removeEventListener('message', receive)
      window.clearInterval(polling)
    }
  }, [playing, sendCommand])

  useEffect(() => {
    if (!playing || !memoryLoaded || currentTime < 5) return
    const closeToEnd = duration > 0 && duration - currentTime < 12
    const resumeSeconds = closeToEnd ? 0 : Math.floor(currentTime)
    if (Math.abs(resumeSeconds - memory.resumeSeconds) < 5) return
    persistMemory({ ...memory, resumeSeconds })
  }, [currentTime, duration, memory, memoryLoaded, persistMemory, playing])

  const handlePlayerLoad = () => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 'lernio-player' }), '*')
    window.setTimeout(() => {
      sendCommand('setPlaybackRate', [memory.playbackRate])
      if (startAt > 0) sendCommand('seekTo', [startAt, true])
    }, 400)
  }

  const changePlaybackRate = (rate: number) => {
    persistMemory({ ...memory, playbackRate: rate })
    sendCommand('setPlaybackRate', [rate])
    toast.success(`Playback speed set to ${rate}×.`)
  }

  const saveBookmark = () => {
    const seconds = Math.max(0, Math.floor(currentTime || startAt))
    const bookmark: VideoBookmark = {
      id: createId(),
      seconds,
      note: bookmarkNote.trim() || `Review ${formatTime(seconds)}`,
      createdAt: new Date().toISOString(),
    }
    persistMemory({ ...memory, bookmarks: [...memory.bookmarks, bookmark].sort((a, b) => a.seconds - b.seconds) })
    setBookmarkNote('')
    toast.success(`Timestamp ${formatTime(seconds)} saved.`)
  }

  const removeBookmark = (bookmarkId: string) => {
    persistMemory({ ...memory, bookmarks: memory.bookmarks.filter((bookmark) => bookmark.id !== bookmarkId) })
  }

  const jumpTo = (seconds: number) => {
    setPlaying(true)
    setStartAt(seconds)
    setCurrentTime(seconds)
    setPlayerKey((value) => value + 1)
  }

  const restart = () => jumpTo(0)
  const resumeAvailable = memory.resumeSeconds >= 5
  const progress = duration > 0 ? Math.min(100, Math.round((currentTime / duration) * 100)) : 0

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="relative aspect-video w-full bg-black">
        {playing ? (
          <iframe
            key={playerKey}
            ref={iframeRef}
            src={buildEmbedUrl()}
            title={title}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={handlePlayerLoad}
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="absolute inset-0 flex h-full w-full items-center justify-center transition-all"
            aria-label={`${resumeAvailable ? `Resume at ${formatTime(memory.resumeSeconds)}` : 'Play'}: ${title}`}
          >
            {thumbnail && !thumbError ? (
              <img
                src={thumbnail}
                alt={title}
                className="absolute inset-0 h-full w-full object-cover"
                onLoad={() => setThumbLoaded(true)}
                onError={() => {
                  setThumbError(true)
                  setThumbLoaded(true)
                }}
              />
            ) : null}

            {!thumbnail && !thumbError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {thumbError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-red-900/30 to-red-700/20">
                <Youtube className="h-12 w-12 text-red-600/80" aria-hidden="true" />
              </div>
            )}

            {thumbLoaded && !thumbError && <div className="absolute inset-0 bg-black/35" />}

            <span className="relative z-10 flex flex-col items-center gap-2">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 shadow-2xl transition-transform hover:scale-110 sm:h-16 sm:w-16">
                <Play className="h-6 w-6 fill-white text-white sm:h-7 sm:w-7" aria-hidden="true" />
              </span>
              {resumeAvailable && (
                <span className="rounded-full bg-black/80 px-3 py-1 text-xs font-semibold text-white">
                  Resume at {formatTime(memory.resumeSeconds)}
                </span>
              )}
            </span>

            {isPlaylist && (
              <span className="absolute left-2 top-2 z-10 rounded bg-black/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                Playlist
              </span>
            )}
            {lowData && (
              <span className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded bg-black/80 px-2 py-1 text-[10px] font-semibold text-white">
                <WifiOff className="h-3 w-3" /> Tap-to-load
              </span>
            )}
          </button>
        )}
      </div>

      {playing && (
        <div className="border-b border-border bg-muted/20 px-3 py-2 sm:px-4">
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span className="font-mono tabular-nums">{formatTime(currentTime)}{duration > 0 ? ` / ${formatTime(duration)}` : ''}</span>
            <span>{progress}% watched</span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <div className="space-y-3 p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 text-sm font-semibold text-foreground">{title}</h3>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
            aria-label="Watch on YouTube (opens in new tab)"
          >
            <ExternalLink className="h-3 w-3" />
            <span className="hidden sm:inline">YouTube</span>
          </a>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {channel && <span className="font-medium">{channel}</span>}
          {language && <span className="rounded bg-muted px-1.5 py-0.5 uppercase tracking-wide">{language}</span>}
          {isPlaylist && <span className="rounded bg-red-600/10 px-1.5 py-0.5 font-medium text-red-600">Playlist</span>}
          {lowData && <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-primary"><WifiOff className="h-3 w-3" /> Low-data preference</span>}
        </div>

        {description && <p className="line-clamp-2 text-xs text-muted-foreground">{description}</p>}

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground"><Gauge className="h-3.5 w-3.5" /> Speed</span>
          {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() => changePlaybackRate(rate)}
              className={cn(
                'rounded-lg border px-2 py-1 text-xs font-semibold',
                memory.playbackRate === rate ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent',
              )}
            >
              {rate}×
            </button>
          ))}
          <button type="button" onClick={restart} className="ml-auto inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-semibold hover:bg-accent">
            <RotateCcw className="h-3.5 w-3.5" /> Restart
          </button>
        </div>

        <div className="rounded-xl border border-border bg-background p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold">Timestamp note</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Save the current moment with what you need to revisit.</p>
            </div>
            <span className="rounded-lg bg-primary/10 px-2 py-1 font-mono text-xs font-semibold text-primary">{formatTime(currentTime || startAt)}</span>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={bookmarkNote}
              onChange={(event) => setBookmarkNote(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') saveBookmark()
              }}
              placeholder="Example: Rewatch the pointer explanation"
              className="min-w-0 flex-1 rounded-lg border border-border bg-card px-3 py-2 text-xs outline-none focus:border-primary"
            />
            <button type="button" onClick={saveBookmark} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
              <BookmarkPlus className="h-3.5 w-3.5" /> Save timestamp
            </button>
          </div>
        </div>

        {memory.bookmarks.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold"><Clock3 className="h-3.5 w-3.5 text-primary" /> Saved moments</p>
              <span className="text-[11px] text-muted-foreground">{memory.bookmarks.length}</span>
            </div>
            <div className="space-y-1.5">
              {memory.bookmarks.map((bookmark) => (
                <div key={bookmark.id} className="flex items-center gap-2 rounded-lg border border-border bg-background p-2">
                  <button type="button" onClick={() => jumpTo(bookmark.seconds)} className="shrink-0 rounded-md bg-primary/10 px-2 py-1 font-mono text-xs font-semibold text-primary hover:bg-primary/15">
                    {formatTime(bookmark.seconds)}
                  </button>
                  <p className="min-w-0 flex-1 truncate text-xs">{bookmark.note}</p>
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-label="Saved" />
                  <button type="button" onClick={() => removeBookmark(bookmark.id)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500" aria-label={`Delete timestamp ${formatTime(bookmark.seconds)}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end border-t border-border pt-3">
          <Link
            href={`/feedback?category=video&resource=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <Flag className="h-3.5 w-3.5" /> Report an incorrect or poor-quality video
          </Link>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { ExternalLink, Play, Youtube, Loader2 } from 'lucide-react'

interface YouTubePlayerProps {
  url: string
  title: string
  channel?: string
  language?: string
  description?: string
  isPlaylist?: boolean
}

interface PlaylistThumbnailState {
  playlistId: string
  url: string | null
  error: boolean
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
  return null
}

/**
 * YouTube video/playlist embed player with thumbnails.
 * Single-video thumbnails are derived directly. Playlist thumbnails load through
 * our server proxy and are keyed so a late response cannot overwrite a new URL.
 */
export function YouTubePlayer({
  url,
  title,
  channel,
  language,
  description,
  isPlaylist,
}: YouTubePlayerProps) {
  const [playing, setPlaying] = useState(false)
  const [playlistThumbnail, setPlaylistThumbnail] = useState<PlaylistThumbnailState>({
    playlistId: '',
    url: null,
    error: false,
  })
  const [loadedThumbnail, setLoadedThumbnail] = useState<string | null>(null)
  const [failedThumbnail, setFailedThumbnail] = useState<string | null>(null)

  const videoId = extractVideoId(url)
  const playlistId = extractPlaylistId(url)
  const directThumbnail = videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null
  const activePlaylistThumbnail =
    playlistId && playlistThumbnail.playlistId === playlistId ? playlistThumbnail : null
  const thumbnail = directThumbnail ?? activePlaylistThumbnail?.url ?? null
  const thumbError =
    (!videoId && !playlistId) ||
    Boolean(activePlaylistThumbnail?.error) ||
    Boolean(thumbnail && failedThumbnail === thumbnail)
  const thumbLoaded = Boolean(thumbnail && loadedThumbnail === thumbnail)

  useEffect(() => {
    if (!playlistId || videoId) return

    const currentPlaylistId = playlistId
    let cancelled = false
    const cacheKey = `yt_thumb_${currentPlaylistId}`

    async function loadPlaylistThumbnail() {
      // Yield once so updates occur in the asynchronous load path rather than
      // synchronously inside the effect body.
      await Promise.resolve()

      try {
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          if (!cancelled) {
            setPlaylistThumbnail({ playlistId: currentPlaylistId, url: cached, error: false })
          }
          return
        }
      } catch {
        // Cache access can fail in privacy modes; network loading still works.
      }

      try {
        const response = await fetch(`/api/youtube-thumbnail?url=${encodeURIComponent(url)}`)
        if (!response.ok) throw new Error(`Thumbnail request failed: ${response.status}`)
        const data = await response.json() as { thumbnail?: string }
        if (!data.thumbnail) throw new Error('Thumbnail response did not include a URL')

        if (!cancelled) {
          setPlaylistThumbnail({ playlistId: currentPlaylistId, url: data.thumbnail, error: false })
        }
        try {
          localStorage.setItem(cacheKey, data.thumbnail)
        } catch {
          // The thumbnail still works even if caching is unavailable.
        }
      } catch {
        if (!cancelled) {
          setPlaylistThumbnail({ playlistId: currentPlaylistId, url: null, error: true })
        }
      }
    }

    void loadPlaylistThumbnail()
    return () => {
      cancelled = true
    }
  }, [url, videoId, playlistId])

  const buildEmbedUrl = useCallback(() => {
    if (isPlaylist && playlistId) {
      return `https://www.youtube-nocookie.com/embed/videoseries?list=${playlistId}&rel=0&autoplay=1`
    }
    if (videoId) {
      return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&autoplay=1`
    }
    return url
  }, [url, isPlaylist, playlistId, videoId])

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="relative aspect-video w-full bg-black">
        {playing ? (
          <iframe
            src={buildEmbedUrl()}
            title={title}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button
            onClick={() => setPlaying(true)}
            className="absolute inset-0 flex h-full w-full items-center justify-center transition-all"
            aria-label={`Play: ${title}`}
          >
            {thumbnail && !thumbError ? (
              <img
                key={thumbnail}
                src={thumbnail}
                alt={title}
                className="absolute inset-0 h-full w-full object-cover"
                onLoad={() => setLoadedThumbnail(thumbnail)}
                onError={() => {
                  setFailedThumbnail(thumbnail)
                  if (playlistId) {
                    setPlaylistThumbnail({ playlistId, url: null, error: true })
                  }
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

            {thumbLoaded && !thumbError && (
              <div className="absolute inset-0 bg-black/30" />
            )}

            <span className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-red-600 shadow-2xl transition-transform hover:scale-110 sm:h-16 sm:w-16">
              <Play className="h-6 w-6 fill-white text-white sm:h-7 sm:w-7" aria-hidden="true" />
            </span>

            {isPlaylist && (
              <span className="absolute top-2 left-2 z-10 rounded bg-black/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                Playlist
              </span>
            )}
          </button>
        )}
      </div>

      <div className="space-y-2 p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground line-clamp-2">{title}</h3>
          <a
            href={url}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            aria-label="Watch on YouTube (opens in new tab)"
          >
            <ExternalLink className="h-3 w-3" />
            <span className="hidden sm:inline">YouTube</span>
          </a>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {channel && <span className="font-medium">{channel}</span>}
          {language && (
            <span className="rounded bg-muted px-1.5 py-0.5 uppercase tracking-wide">
              {language}
            </span>
          )}
          {isPlaylist && (
            <span className="rounded bg-red-600/10 px-1.5 py-0.5 font-medium text-red-600">
              Playlist
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
        )}
      </div>
    </div>
  )
}

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

/**
 * Extract playlist ID from a YouTube URL.
 */
function extractPlaylistId(url: string): string | null {
  const match = url.match(/[?&]list=([\w-]+)/)
  return match ? match[1] : null
}

/**
 * Extract video ID from a YouTube URL.
 */
function extractVideoId(url: string): string | null {
  const watchMatch = url.match(/[?&]v=([\w-]{11})/)
  if (watchMatch) return watchMatch[1]
  const shortMatch = url.match(/youtu\.be\/([\w-]{11})/)
  if (shortMatch) return shortMatch[1]
  return null
}

/**
 * YouTube video/playlist embed player with thumbnails.
 *
 * For single videos: uses i.ytimg.com thumbnail (instant, no API needed).
 * For playlists: fetches thumbnail via YouTube oEmbed API (one request per
 * playlist, cached in localStorage to avoid re-fetching).
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
  const [thumbnail, setThumbnail] = useState<string | null>(null)
  const [thumbnailLoading, setThumbnailLoading] = useState(true)

  const videoId = extractVideoId(url)
  const playlistId = extractPlaylistId(url)

  // For single videos, we can get the thumbnail instantly
  useEffect(() => {
    if (videoId) {
      setThumbnail(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`)
      setThumbnailLoading(false)
      return
    }

    // For playlists, try to fetch via oEmbed
    if (playlistId) {
      // Check localStorage cache first
      const cacheKey = `yt_thumb_${playlistId}`
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        setThumbnail(cached)
        setThumbnailLoading(false)
        return
      }

      // Fetch via oEmbed (returns thumbnail_url for playlists)
      setThumbnailLoading(true)
      fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`)
        .then((res) => res.json())
        .then((data) => {
          if (data.thumbnail_url) {
            setThumbnail(data.thumbnail_url)
            localStorage.setItem(cacheKey, data.thumbnail_url)
          }
        })
        .catch(() => {
          // Fallback: use YouTube's placeholder for playlists
          setThumbnail(null)
        })
        .finally(() => setThumbnailLoading(false))
      return
    }

    setThumbnailLoading(false)
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
      {/* Video / Embed area */}
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
            className="absolute inset-0 flex h-full w-full items-center justify-center transition-all hover:bg-black/20"
            aria-label={`Play: ${title}`}
          >
            {/* Thumbnail background */}
            {thumbnailLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : thumbnail ? (
              <img
                src={thumbnail}
                alt={title}
                className="absolute inset-0 h-full w-full object-cover"
                onError={(e) => {
                  // If thumbnail fails to load, show gradient fallback
                  e.currentTarget.style.display = 'none'
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-red-900/30 to-red-700/20">
                <Youtube className="h-16 w-16 text-red-600" aria-hidden="true" />
              </div>
            )}

            {/* Dark overlay for better play button visibility */}
            <div className="absolute inset-0 bg-black/30 transition-opacity hover:bg-black/40" />

            {/* Play button */}
            <span className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-red-600 shadow-2xl transition-transform hover:scale-110 sm:h-16 sm:w-16">
              <Play className="h-6 w-6 fill-white text-white sm:h-7 sm:w-7" aria-hidden="true" />
            </span>

            {/* Playlist badge */}
            {isPlaylist && (
              <span className="absolute top-2 left-2 z-10 rounded bg-black/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                Playlist
              </span>
            )}
          </button>
        )}
      </div>

      {/* Metadata */}
      <div className="space-y-2 p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground line-clamp-2">{title}</h3>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
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

'use client'

import { useState, useCallback } from 'react'
import { ExternalLink, Play, Youtube } from 'lucide-react'

interface YouTubePlayerProps {
  url: string
  title: string
  channel?: string
  language?: string
  description?: string
  isPlaylist?: boolean
}

/**
 * YouTube video/playlist embed player.
 * Uses youtube-nocookie.com for privacy-enhanced embeds.
 * Lazy-loads the iframe (click to play) for performance.
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

  const buildEmbedUrl = useCallback(() => {
    if (isPlaylist) {
      const match = url.match(/[?&]list=([\w-]+)/)
      if (match) {
        return `https://www.youtube-nocookie.com/embed/videoseries?list=${match[1]}&rel=0&autoplay=1`
      }
    }
    const videoMatch = url.match(/[?&]v=([\w-]{11})/) ?? url.match(/youtu\.be\/([\w-]{11})/)
    if (videoMatch) {
      return `https://www.youtube-nocookie.com/embed/${videoMatch[1]}?rel=0&autoplay=1`
    }
    return url
  }, [url, isPlaylist])

  const videoMatch = url.match(/[?&]v=([\w-]{11})/) ?? url.match(/youtu\.be\/([\w-]{11})/)
  const thumbnail = videoMatch
    ? `https://i.ytimg.com/vi/${videoMatch[1]}/hqdefault.jpg`
    : null

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
            className="absolute inset-0 flex h-full w-full items-center justify-center bg-gradient-to-br from-muted/50 to-muted/20 transition-colors hover:from-muted/70 hover:to-muted/40"
            aria-label={`Play: ${title}`}
          >
            {thumbnail ? (
              <img
                src={thumbnail}
                alt={title}
                className="absolute inset-0 h-full w-full object-cover opacity-80"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-red-900/30 to-red-700/20">
                <Youtube className="h-16 w-16 text-red-600" aria-hidden="true" />
              </div>
            )}
            <span className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-red-600 shadow-lg transition-transform hover:scale-110">
              <Play className="h-7 w-7 fill-white text-white" aria-hidden="true" />
            </span>
          </button>
        )}
      </div>
      <div className="space-y-2 p-4">
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
            YouTube
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

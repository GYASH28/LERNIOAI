import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Server-side proxy for YouTube thumbnails.
 *
 * The browser cannot fetch youtube.com/oembed directly due to CORS.
 * This route fetches thumbnails server-side with multiple fallbacks:
 *
 * 1. Try YouTube oEmbed API (works for most public videos & playlists)
 * 2. If oEmbed fails, try to extract a video ID and use i.ytimg.com
 * 3. If playlist, try fetching the playlist page and extracting the
 *    first video's thumbnail
 *
 * Usage: GET /api/youtube-thumbnail?url=https://www.youtube.com/playlist?list=...
 *        GET /api/youtube-thumbnail?url=https://www.youtube.com/watch?v=...
 */

function extractVideoId(url: string): string | null {
  const watchMatch = url.match(/[?&]v=([\w-]{11})/)
  if (watchMatch) return watchMatch[1]
  const shortMatch = url.match(/youtu\.be\/([\w-]{11})/)
  if (shortMatch) return shortMatch[1]
  return null
}

function extractPlaylistId(url: string): string | null {
  const match = url.match(/[?&]list=([\w-]+)/)
  return match ? match[1] : null
}

async function fetchOEmbed(videoUrl: string) {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`
    const res = await fetch(oembedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) return null

    const data = await res.json()
    return {
      thumbnail: data.thumbnail_url ?? null,
      title: data.title ?? null,
      author: data.author_name ?? null,
    }
  } catch {
    return null
  }
}

/**
 * Fetch the YouTube playlist page and extract the first video's thumbnail.
 * This is a fallback when oEmbed fails for playlists.
 */
async function fetchPlaylistThumbnail(playlistId: string): Promise<string | null> {
  try {
    const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`
    const res = await fetch(playlistUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) return null

    const html = await res.text()

    // Look for the first video ID in the playlist page
    // YouTube embeds video IDs in various data attributes and JSON
    const videoIdPatterns = [
      /"videoId":"([\w-]{11})"/,
      /"playlistVideoRenderer":\{"videoId":"([\w-]{11})"/,
      /watch\?v=([\w-]{11})/,
      /youtu\.be\/([\w-]{11})/,
    ]

    for (const pattern of videoIdPatterns) {
      const match = html.match(pattern)
      if (match?.[1]) {
        return `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg`
      }
    }

    return null
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const videoUrl = url.searchParams.get('url')

  if (!videoUrl) {
    return Response.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  // For single videos, use i.ytimg.com directly (instant, no API call)
  const videoId = extractVideoId(videoUrl)
  if (videoId) {
    return Response.json({
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      title: null,
      author: null,
      source: 'ytimg-direct',
    }, {
      headers: { 'Cache-Control': 'public, max-age=86400' },
    })
  }

  // For playlists, try oEmbed first, then fall back to page scraping
  const playlistId = extractPlaylistId(videoUrl)

  // Try oEmbed
  const oembedResult = await fetchOEmbed(videoUrl)
  if (oembedResult?.thumbnail) {
    return Response.json(oembedResult, {
      headers: { 'Cache-Control': 'public, max-age=86400' },
    })
  }

  // Fallback: scrape playlist page for first video thumbnail
  if (playlistId) {
    const playlistThumb = await fetchPlaylistThumbnail(playlistId)
    if (playlistThumb) {
      return Response.json({
        thumbnail: playlistThumb,
        title: null,
        author: null,
        source: 'playlist-scrape',
      }, {
        headers: { 'Cache-Control': 'public, max-age=3600' },
      })
    }
  }

  return Response.json({
    error: 'Could not fetch thumbnail',
    thumbnail: null,
  }, {
    status: 404,
    headers: { 'Cache-Control': 'public, max-age=300' },
  })
}

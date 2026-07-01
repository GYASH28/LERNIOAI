import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Server-side proxy for YouTube oEmbed API.
 * 
 * The browser cannot fetch youtube.com/oembed directly due to CORS.
 * This route fetches it server-side and returns the thumbnail URL.
 * 
 * Usage: GET /api/youtube-thumbnail?url=https://www.youtube.com/playlist?list=...
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const videoUrl = url.searchParams.get('url')

  if (!videoUrl) {
    return Response.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`
    const res = await fetch(oembedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 86400 }, // cache for 24 hours
    })

    if (!res.ok) {
      return Response.json({ error: 'YouTube API error' }, { status: res.status })
    }

    const data = await res.json()
    return Response.json({
      thumbnail: data.thumbnail_url ?? null,
      title: data.title ?? null,
      author: data.author_name ?? null,
    }, {
      headers: { 'Cache-Control': 'public, max-age=86400' },
    })
  } catch {
    return Response.json({ error: 'Failed to fetch thumbnail' }, { status: 500 })
  }
}

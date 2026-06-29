export const LESSON_RESOURCE_ROLES = [
  'primary_video',
  'alternate_video',
  'lesson_notes',
  'transcript',
  'infographic',
  'worksheet',
  'formula_sheet',
  'lab_demo',
  'reference',
] as const

export type LessonResourceRole = (typeof LESSON_RESOURCE_ROLES)[number]

export interface CanonicalYouTubeResource {
  kind: 'video' | 'playlist'
  canonicalUrl: string
  externalId: string
  videoId: string | null
  playlistId: string | null
}

export function isLessonResourceRole(role: unknown): role is LessonResourceRole {
  return LESSON_RESOURCE_ROLES.includes(String(role || '') as LessonResourceRole)
}

export function normalizeLessonResourceRole(role: unknown): LessonResourceRole | null {
  const normalized = String(role || '').trim().toLowerCase()
  return isLessonResourceRole(normalized) ? normalized : null
}

export function canonicalizeYouTubeUrl(input: string): CanonicalYouTubeResource | null {
  const raw = input.trim()
  if (!raw) return null

  let parsed: URL
  try {
    parsed = new URL(raw.startsWith('http') ? raw : `https://${raw}`)
  } catch {
    return null
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '')
  if (!['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be', 'youtube-nocookie.com'].includes(host)) {
    return null
  }

  const playlistId = cleanYouTubeId(parsed.searchParams.get('list'))
  const videoId =
    host === 'youtu.be'
      ? cleanYouTubeId(parsed.pathname.split('/').filter(Boolean)[0])
      : videoIdFromPath(parsed) ?? cleanYouTubeId(parsed.searchParams.get('v'))

  if (videoId) {
    const canonicalUrl = playlistId
      ? `https://www.youtube.com/watch?v=${videoId}&list=${playlistId}`
      : `https://www.youtube.com/watch?v=${videoId}`
    return {
      kind: 'video',
      canonicalUrl,
      externalId: videoId,
      videoId,
      playlistId: playlistId ?? null,
    }
  }

  if (playlistId) {
    return {
      kind: 'playlist',
      canonicalUrl: `https://www.youtube.com/playlist?list=${playlistId}`,
      externalId: playlistId,
      videoId: null,
      playlistId,
    }
  }

  return null
}

function videoIdFromPath(url: URL): string | null {
  const parts = url.pathname.split('/').filter(Boolean)
  const marker = parts[0]
  if ((marker === 'embed' || marker === 'shorts' || marker === 'live') && parts[1]) {
    return cleanYouTubeId(parts[1])
  }
  return null
}

function cleanYouTubeId(value: string | null | undefined): string | null {
  const cleaned = String(value || '').trim()
  if (!cleaned || !/^[A-Za-z0-9_-]+$/.test(cleaned)) return null
  return cleaned
}


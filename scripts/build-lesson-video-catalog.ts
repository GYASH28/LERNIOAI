import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'

interface CandidateManifest {
  candidates: Array<{
    id: string
    sourcePdf?: string | null
    sourcePage?: number | null
    resourceKind: 'video' | 'playlist'
    videoId?: string | null
    playlistId?: string | null
    role: string
    officialSubjectCodes: string[]
    programmeCodes: string[]
    metadata?: {
      title?: string | null
      channel?: string | null
    }
  }>
}

interface LessonNotes {
  subjectCode: string
  subjectName?: string
  units: Array<{
    lessons: Array<{
      slug: string
      title: string
      overview: string
      keyConcepts: string[]
      objectives?: string[]
    }>
  }>
}

interface PlaylistVideo {
  videoId: string
  title: string
  description: string
  channel: string
  playlistId: string | null
  playlistIndex: number
}

interface Mapping {
  subjectCode: string
  lessonSlug: string
  videoId: string
  title: string
  channel: string
  language: string
  description: string
  playlistId: string | null
  playlistIndex: number | null
  confidence: number
  reviewStatus: 'pending_review'
  sourcePdf: string
  sourcePage: number
}

const root = process.cwd()
const apiKey = process.env.YOUTUBE_DATA_API_KEY?.trim()
const candidatesPath = join(root, 'content', 'resources', 'youtube-candidates', 'cwit-r23-youtube-candidates.json')
const notesDir = join(root, 'content', 'lesson-notes')
const officialCourseContentPath = join(root, 'content', 'curriculum', 'cwit-r23', 'official-course-content.json')
const outputPath = join(root, 'content', 'resources', 'lesson-video-mappings', 'cwit-r23-direct-video-mappings.json')
const dryRun = process.argv.includes('--dry-run')

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'into',
  'is', 'it', 'of', 'on', 'or', 'the', 'to', 'using', 'with', 'introduction',
  'overview', 'basic', 'basics', 'concept', 'concepts', 'lecture', 'lectures',
  'tutorial', 'part', 'class', 'chapter', 'unit', 'english', 'hindi',
])

async function main() {
  if (!existsSync(candidatesPath)) throw new Error(`Missing candidate manifest: ${relative(root, candidatesPath)}`)

  const candidateManifest = JSON.parse(readFileSync(candidatesPath, 'utf-8')) as CandidateManifest
  const notesByCode = loadNotes()
  const resourceCandidates = candidateManifest.candidates.filter(
    (candidate) => candidate.officialSubjectCodes.length > 0,
  )
  const playlistCache = new Map<string, PlaylistVideo[]>()
  const mappings: Mapping[] = []
  const researchErrors: Array<{ playlistId: string; message: string }> = []
  const coverage: Array<{
    subjectCode: string
    lessons: number
    mapped: number
    approvedAuto: number
    pendingReview: number
    missingLessonNotes: boolean
  }> = []

  const subjectCodes = [...notesByCode.keys()].sort()
  for (const subjectCode of subjectCodes) {
    const notes = notesByCode.get(subjectCode.toUpperCase())
    if (!notes) {
      coverage.push({ subjectCode, lessons: 0, mapped: 0, approvedAuto: 0, pendingReview: 0, missingLessonNotes: true })
      continue
    }

    const lessons = notes.units.flatMap((unit) => unit.lessons)
    const candidates = resourceCandidates.filter((candidate) => candidate.officialSubjectCodes.includes(subjectCode))
    const videos: Array<PlaylistVideo & { sourcePdf: string; sourcePage: number; role: string }> = []

    for (const candidate of candidates) {
      if (candidate.resourceKind === 'video' && candidate.videoId && candidate.metadata?.title && candidate.metadata.channel) {
        if (isAllowedChannel(candidate.metadata.channel) && !/\bmarathi\b|मराठी/i.test(candidate.metadata.title)) {
          videos.push({
            videoId: candidate.videoId,
            title: candidate.metadata.title,
            description: candidate.metadata.title,
            channel: candidate.metadata.channel,
            playlistId: null,
            playlistIndex: 0,
            sourcePdf: candidate.sourcePdf ?? 'CWIT YouTube Lecture Guide',
            sourcePage: candidate.sourcePage ?? 0,
            role: candidate.role,
          })
        }
        continue
      }
      if (!candidate.playlistId) continue
      const playlistId = candidate.playlistId as string
      let playlistVideos = playlistCache.get(playlistId)
      if (!playlistVideos) {
        try {
          playlistVideos = await fetchPlaylistVideos(playlistId)
        } catch (error) {
          researchErrors.push({
            playlistId,
            message: error instanceof Error ? error.message : String(error),
          })
          playlistVideos = []
        }
        playlistCache.set(playlistId, playlistVideos)
      }
      for (const video of playlistVideos) {
        videos.push({
          ...video,
          sourcePdf: candidate.sourcePdf ?? 'CWIT YouTube Lecture Guide',
          sourcePage: candidate.sourcePage ?? 0,
          role: candidate.role,
        })
      }
    }

    const pairs = lessons.flatMap((lesson, lessonIndex) =>
      videos.map((video, videoIndex) => {
        const scoring = scoreMatch(lesson, video)
        return { lesson, lessonIndex, video, videoIndex, ...scoring }
      }),
    )
    pairs.sort((left, right) =>
      right.score - left.score ||
      right.titleOverlap - left.titleOverlap ||
      left.lessonIndex - right.lessonIndex ||
      left.videoIndex - right.videoIndex,
    )

    const usedLessons = new Set<string>()
    const usedVideos = new Set<string>()
    for (const pair of pairs) {
      if (pair.score < 4) continue
      if (usedLessons.has(pair.lesson.slug) || usedVideos.has(pair.video.videoId)) continue
      const confidence = confidenceForScore(pair.score, pair.titleOverlap)
      mappings.push({
        subjectCode,
        lessonSlug: pair.lesson.slug,
        videoId: pair.video.videoId,
        title: pair.video.title,
        channel: pair.video.channel,
        language: inferLanguage(`${pair.video.title} ${pair.video.description}`),
        description: pair.video.description,
        playlistId: pair.video.playlistId,
        playlistIndex: pair.video.playlistIndex,
        confidence,
        reviewStatus: 'pending_review',
        sourcePdf: pair.video.sourcePdf,
        sourcePage: pair.video.sourcePage,
      })
      usedLessons.add(pair.lesson.slug)
      usedVideos.add(pair.video.videoId)
    }

    const missingLessons = lessons.filter((lesson) => !usedLessons.has(lesson.slug))
    const searchResearch = await Promise.all(missingLessons.map(async (lesson) => {
      try {
        return {
          lesson,
          searchResults: await fetchPublicSearchVideos(
            `${notes.subjectName ?? subjectCode} ${lesson.title} diploma tutorial Hindi English`,
          ),
        }
      } catch (error) {
        researchErrors.push({
          playlistId: `search:${subjectCode}:${lesson.slug}`,
          message: error instanceof Error ? error.message : String(error),
        })
        return { lesson, searchResults: [] as PlaylistVideo[] }
      }
    }))

    for (const { lesson, searchResults } of searchResearch) {
        const best = searchResults
          .filter((video) => !usedVideos.has(video.videoId))
          .map((video) => ({ video, ...scoreMatch(lesson, video) }))
          .filter((result) => result.score >= 4)
          .sort((left, right) => right.score - left.score || right.titleOverlap - left.titleOverlap)[0]
        if (!best) continue
        mappings.push({
          subjectCode,
          lessonSlug: lesson.slug,
          videoId: best.video.videoId,
          title: best.video.title,
          channel: best.video.channel,
          language: inferLanguage(best.video.title),
          description: best.video.description,
          playlistId: null,
          playlistIndex: null,
          confidence: confidenceForScore(best.score, best.titleOverlap),
          reviewStatus: 'pending_review',
          sourcePdf: 'Lesson-specific YouTube public search against official CWIT scope',
          sourcePage: 0,
        })
        usedLessons.add(lesson.slug)
        usedVideos.add(best.video.videoId)
    }

    const subjectMappings = mappings.filter((mapping) => mapping.subjectCode === subjectCode)
    coverage.push({
      subjectCode,
      lessons: lessons.length,
      mapped: subjectMappings.length,
      approvedAuto: 0,
      pendingReview: subjectMappings.filter((mapping) => mapping.reviewStatus === 'pending_review').length,
      missingLessonNotes: false,
    })
  }

  const output = {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: relative(root, candidatesPath).replaceAll('\\', '/'),
    policy: {
      playlistPlayersAllowed: false,
      duplicateVideoWithinSubjectAllowed: false,
      autoApprovalThreshold: null,
      note: 'Pending mappings remain invisible to students until a named academic reviewer approves them.',
    },
    researchErrors,
    coverage,
    mappings: mappings.sort((left, right) =>
      left.subjectCode.localeCompare(right.subjectCode) || left.lessonSlug.localeCompare(right.lessonSlug),
    ),
  }

  if (!dryRun) {
    mkdirSync(dirname(outputPath), { recursive: true })
    writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf-8')
    console.warn(`[lesson-video-catalog] wrote ${mappings.length} mappings to ${relative(root, outputPath)}`)
  }
  console.warn(JSON.stringify({ dryRun, playlists: playlistCache.size, mappings: mappings.length, coverage }, null, 2))
}

function loadNotes() {
  const notesByCode = new Map<string, LessonNotes>()
  if (!existsSync(notesDir)) return notesByCode
  for (const file of readdirSync(notesDir).filter((name) => name.endsWith('.json'))) {
    try {
      const notes = JSON.parse(readFileSync(join(notesDir, file), 'utf-8')) as LessonNotes
      if (notes.subjectCode && Array.isArray(notes.units)) notesByCode.set(notes.subjectCode.trim().toUpperCase(), notes)
    } catch (error) {
      console.warn(`[lesson-video-catalog] skipped invalid notes file ${file}`, error)
    }
  }
  if (existsSync(officialCourseContentPath)) {
    try {
      const official = JSON.parse(readFileSync(officialCourseContentPath, 'utf-8')) as {
        subjects?: Array<{
          subjectCode: string
          subjectName?: string
          units: Array<{
            order: number
            title: string
            curriculumContent?: string
            learningOutcomes?: string[]
          }>
        }>
      }
      for (const subject of official.subjects ?? []) {
        const code = subject.subjectCode.trim().toUpperCase()
        if (notesByCode.has(code)) continue
        notesByCode.set(code, {
          subjectCode: code,
          subjectName: subject.subjectName,
          units: subject.units.map((unit) => ({
            lessons: [{
              slug: `unit-${unit.order}-${slugify(unit.title) || 'official-curriculum-unit'}`,
              title: unit.title,
              overview: unit.curriculumContent ?? '',
              keyConcepts: curriculumLines(unit.curriculumContent ?? ''),
              objectives: unit.learningOutcomes ?? [],
            }],
          })),
        })
      }
    } catch (error) {
      console.warn('[lesson-video-catalog] skipped invalid official course content', error)
    }
  }
  return notesByCode
}

async function fetchPlaylistVideos(playlistId: string): Promise<PlaylistVideo[]> {
  if (!apiKey) return fetchPublicPlaylistVideos(playlistId)
  const videos: PlaylistVideo[] = []
  let pageToken: string | undefined
  do {
    const params = new URLSearchParams({
      part: 'snippet',
      maxResults: '50',
      playlistId,
      key: apiKey as string,
      ...(pageToken ? { pageToken } : {}),
    })
    const response = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${params.toString()}`)
    if (!response.ok) throw new Error(`YouTube playlistItems failed for ${playlistId}: ${response.status} ${await response.text()}`)
    const payload = await response.json() as {
      nextPageToken?: string
      items?: Array<{
        snippet?: {
          title?: string
          description?: string
          channelTitle?: string
          position?: number
          resourceId?: { videoId?: string }
        }
      }>
    }
    for (const item of payload.items ?? []) {
      const snippet = item.snippet
      const videoId = snippet?.resourceId?.videoId
      if (!videoId || !snippet?.title || snippet.title === 'Private video' || snippet.title === 'Deleted video') continue
      videos.push({
        videoId,
        title: snippet.title,
        description: snippet.description ?? '',
        channel: snippet.channelTitle ?? 'YouTube',
        playlistId,
        playlistIndex: snippet.position ?? videos.length,
      })
    }
    pageToken = payload.nextPageToken
  } while (pageToken)
  return videos
}

async function fetchPublicPlaylistVideos(playlistId: string): Promise<PlaylistVideo[]> {
  const response = await fetch(`https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}`, {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; LernioCurriculumResearch/1.0)' },
    signal: AbortSignal.timeout(20_000),
  })
  if (!response.ok) throw new Error(`YouTube playlist page failed for ${playlistId}: ${response.status}`)
  const html = await response.text()
  return videosFromYoutubeHtml(html, playlistId)
}

async function fetchPublicSearchVideos(query: string): Promise<PlaylistVideo[]> {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
  let lastError: unknown
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; LernioCurriculumResearch/1.0)' },
        signal: AbortSignal.timeout(15_000),
      })
      if (!response.ok) throw new Error(`YouTube search failed: ${response.status}`)
      return videosFromYoutubeHtml(await response.text(), null)
    } catch (error) {
      lastError = error
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)))
    }
  }
  throw lastError instanceof Error ? lastError : new Error('YouTube search failed')
}

function videosFromYoutubeHtml(html: string, playlistId: string | null): PlaylistVideo[] {
  const marker = 'var ytInitialData = '
  const start = html.indexOf(marker)
  if (start < 0) throw new Error('YouTube initial data missing')
  const jsonStart = start + marker.length
  const jsonEnd = html.indexOf(';</script>', jsonStart)
  if (jsonEnd < 0) throw new Error('YouTube initial data terminator missing')
  const initialData = JSON.parse(html.slice(jsonStart, jsonEnd)) as unknown
  const lockups: Record<string, unknown>[] = []
  const videoRenderers: Record<string, unknown>[] = []
  collectLockups(initialData, lockups)
  collectVideoRenderers(initialData, videoRenderers)

  const lockupVideos = lockups.flatMap((lockup, index) => {
    if (lockup.contentType !== 'LOCKUP_CONTENT_TYPE_VIDEO' || typeof lockup.contentId !== 'string') return []
    const metadata = objectAt(lockup, 'metadata', 'lockupMetadataViewModel')
    const title = stringAt(metadata, 'title', 'content')
    if (!title) return []
    const avatar = objectAt(metadata, 'image', 'decoratedAvatarViewModel')
    const channelLabel = stringAt(avatar, 'a11yLabel')
    const channel = channelLabel?.replace(/^Go to channel\s+/i, '').trim() || 'YouTube'
    if (!isAllowedChannel(channel) || /\bmarathi\b|मराठी/i.test(title)) return []
    const watchEndpoint = objectAt(lockup, 'rendererContext', 'commandContext', 'onTap', 'innertubeCommand', 'watchEndpoint')
    const playlistIndex = numberAt(watchEndpoint, 'index') ?? index
    return [{
      videoId: lockup.contentId,
      title,
      description: title,
      channel,
      playlistId,
      playlistIndex,
    }]
  })
  const rendererVideos = videoRenderers.flatMap((renderer, index) => {
    if (typeof renderer.videoId !== 'string') return []
    const title = stringAt(renderer, 'title', 'runs', '0', 'text')
    const channel = stringAt(renderer, 'longBylineText', 'runs', '0', 'text') ?? 'YouTube'
    if (!title || !isAllowedChannel(channel) || /\bmarathi\b|मराठी/i.test(title)) return []
    return [{
      videoId: renderer.videoId,
      title,
      description: title,
      channel,
      playlistId,
      playlistIndex: index,
    }]
  })
  return [...lockupVideos, ...rendererVideos]
}

function collectLockups(value: unknown, output: Record<string, unknown>[]) {
  if (Array.isArray(value)) {
    for (const item of value) collectLockups(item, output)
    return
  }
  if (!value || typeof value !== 'object') return
  const record = value as Record<string, unknown>
  if (record.lockupViewModel && typeof record.lockupViewModel === 'object') {
    output.push(record.lockupViewModel as Record<string, unknown>)
  }
  for (const nested of Object.values(record)) collectLockups(nested, output)
}

function collectVideoRenderers(value: unknown, output: Record<string, unknown>[]) {
  if (Array.isArray(value)) {
    for (const item of value) collectVideoRenderers(item, output)
    return
  }
  if (!value || typeof value !== 'object') return
  const record = value as Record<string, unknown>
  if (record.videoRenderer && typeof record.videoRenderer === 'object') {
    output.push(record.videoRenderer as Record<string, unknown>)
  }
  for (const nested of Object.values(record)) collectVideoRenderers(nested, output)
}

function objectAt(value: unknown, ...path: string[]): Record<string, unknown> {
  let current: unknown = value
  for (const key of path) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return {}
    current = (current as Record<string, unknown>)[key]
  }
  return current && typeof current === 'object' && !Array.isArray(current)
    ? current as Record<string, unknown>
    : {}
}

function stringAt(value: unknown, ...path: string[]) {
  let current: unknown = value
  for (const key of path) {
    if (Array.isArray(current)) {
      const index = Number.parseInt(key, 10)
      if (!Number.isInteger(index)) return null
      current = current[index]
    } else {
      if (!current || typeof current !== 'object') return null
      current = (current as Record<string, unknown>)[key]
    }
  }
  return typeof current === 'string' ? current : null
}

function numberAt(value: unknown, ...path: string[]) {
  let current: unknown = value
  for (const key of path) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return null
    current = (current as Record<string, unknown>)[key]
  }
  return typeof current === 'number' ? current : null
}

const ALLOWED_CHANNEL_PATTERNS = [
  /gate smashers/i,
  /neso academy/i,
  /knowledge gate/i,
  /jenny.?s lectures/i,
  /codewithharry/i,
  /apna college/i,
  /wscube tech/i,
  /last moment tuitions/i,
  /ekeeda/i,
  /gajendra purohit/i,
  /all about electronics/i,
  /khan academy/i,
  /freecodecamp/i,
  /programming with mosh/i,
  /ibm technology/i,
  /simplilearn/i,
  /kharat academy/i,
  /easy engineering classes/i,
  /5 minutes engineering/i,
  /education 4u/i,
  /sundeep saradhi/i,
]

function isAllowedChannel(channel: string) {
  return ALLOWED_CHANNEL_PATTERNS.some((pattern) => pattern.test(channel))
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function curriculumLines(value: string) {
  return value.split(/\n+|(?=\b\d+\.\d+\s+)/).map((line) => line.trim()).filter(Boolean).slice(0, 24)
}

function scoreMatch(
  lesson: { title: string; overview: string; keyConcepts: string[]; objectives?: string[] },
  video: PlaylistVideo,
) {
  const lessonTitle = tokens(lesson.title)
  const lessonContext = tokens([lesson.overview, ...lesson.keyConcepts, ...(lesson.objectives ?? [])].join(' '))
  const videoTitle = tokens(video.title)
  const videoContext = tokens(`${video.title} ${video.description}`)
  const titleOverlap = overlap(lessonTitle, videoTitle)
  const conceptOverlap = overlap(lessonContext, videoContext)
  return { score: titleOverlap * 6 + conceptOverlap * 2, titleOverlap, conceptOverlap }
}

function tokens(value: string) {
  return new Set(value.toLowerCase().replace(/[^a-z0-9+#]+/g, ' ').split(/\s+/).filter((token) => token.length > 1 && !STOP_WORDS.has(token)))
}

function overlap(left: Set<string>, right: Set<string>) {
  let count = 0
  for (const token of left) if (right.has(token)) count += token.length >= 6 ? 2 : 1
  return count
}

function confidenceForScore(score: number, titleOverlap: number) {
  const titleBoost = Math.min(0.18, titleOverlap * 0.06)
  return Math.min(0.99, Number((0.38 + score / 48 + titleBoost).toFixed(3)))
}

function inferLanguage(value: string) {
  const normalized = value.toLowerCase()
  if (/\b(hindi|hinglish|मराठी|marathi)\b/.test(normalized)) return normalized.includes('marathi') || normalized.includes('मराठी') ? 'mr' : 'hi'
  return 'en'
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

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
  }>
}

interface LessonNotes {
  subjectCode: string
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
  playlistId: string
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
  reviewStatus: 'approved_auto' | 'pending_review'
  sourcePdf: string
  sourcePage: number
}

const root = process.cwd()
const apiKey = process.env.YOUTUBE_DATA_API_KEY?.trim()
const candidatesPath = join(root, 'content', 'resources', 'youtube-candidates', 'cwit-r23-youtube-candidates.json')
const notesDir = join(root, 'content', 'lesson-notes')
const outputPath = join(root, 'content', 'resources', 'lesson-video-mappings', 'cwit-r23-direct-video-mappings.json')
const dryRun = process.argv.includes('--dry-run')
const allowAutoApproval = !process.argv.includes('--review-all')

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'into',
  'is', 'it', 'of', 'on', 'or', 'the', 'to', 'using', 'with', 'introduction',
  'overview', 'basic', 'basics', 'concept', 'concepts', 'lecture', 'lectures',
  'tutorial', 'part', 'class', 'chapter', 'unit', 'english', 'hindi',
])

async function main() {
  if (!apiKey) throw new Error('YOUTUBE_DATA_API_KEY is required to expand playlist resources into direct videos.')
  if (!existsSync(candidatesPath)) throw new Error(`Missing candidate manifest: ${relative(root, candidatesPath)}`)

  const candidateManifest = JSON.parse(readFileSync(candidatesPath, 'utf-8')) as CandidateManifest
  const notesByCode = loadNotes()
  const playlistCandidates = candidateManifest.candidates.filter(
    (candidate) => candidate.resourceKind === 'playlist' && candidate.playlistId && candidate.officialSubjectCodes.length > 0,
  )

  const playlistCache = new Map<string, PlaylistVideo[]>()
  const mappings: Mapping[] = []
  const coverage: Array<{
    subjectCode: string
    lessons: number
    mapped: number
    approvedAuto: number
    pendingReview: number
    missingLessonNotes: boolean
  }> = []

  const subjectCodes = [...new Set(playlistCandidates.flatMap((candidate) => candidate.officialSubjectCodes))].sort()
  for (const subjectCode of subjectCodes) {
    const notes = notesByCode.get(subjectCode.toUpperCase())
    if (!notes) {
      coverage.push({ subjectCode, lessons: 0, mapped: 0, approvedAuto: 0, pendingReview: 0, missingLessonNotes: true })
      continue
    }

    const lessons = notes.units.flatMap((unit) => unit.lessons)
    const candidates = playlistCandidates.filter((candidate) => candidate.officialSubjectCodes.includes(subjectCode))
    const videos: Array<PlaylistVideo & { sourcePdf: string; sourcePage: number; role: string }> = []

    for (const candidate of candidates) {
      const playlistId = candidate.playlistId as string
      let playlistVideos = playlistCache.get(playlistId)
      if (!playlistVideos) {
        playlistVideos = await fetchPlaylistVideos(playlistId)
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
        reviewStatus: allowAutoApproval && confidence >= 0.82 && pair.titleOverlap > 0 ? 'approved_auto' : 'pending_review',
        sourcePdf: pair.video.sourcePdf,
        sourcePage: pair.video.sourcePage,
      })
      usedLessons.add(pair.lesson.slug)
      usedVideos.add(pair.video.videoId)
    }

    const subjectMappings = mappings.filter((mapping) => mapping.subjectCode === subjectCode)
    coverage.push({
      subjectCode,
      lessons: lessons.length,
      mapped: subjectMappings.length,
      approvedAuto: subjectMappings.filter((mapping) => mapping.reviewStatus === 'approved_auto').length,
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
      autoApprovalThreshold: allowAutoApproval ? 0.82 : null,
      note: 'Pending mappings remain invisible to students until reviewed. Approved-auto mappings require strong title overlap and confidence.',
    },
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
  return notesByCode
}

async function fetchPlaylistVideos(playlistId: string): Promise<PlaylistVideo[]> {
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

/**
 * Manifest-based curriculum data loader.
 *
 * Reads the versioned JSON manifests from content/curriculum/cwit-r23/
 * and provides typed data in the same shape as the DB-backed loaders.
 *
 * This is used as a FALLBACK when the database has no curriculum data yet,
 * so the Learn page is never empty — students see subjects + YouTube
 * resources immediately, even before `npm run curriculum:import-with-resources`
 * has been run.
 *
 * Per the master prompt (§9 Phase 4): "Create a versioned, machine-readable
 * curriculum manifest system. Do not continue expanding the destructive
 * single-semester seed file as one giant source of truth."
 */
import 'server-only'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ManifestResource {
  title: string
  channel: string
  language: string
  role: string // primary_video | alternate_video
  url: string
  playlistId?: string | null
  videoId?: string | null
  description: string
  sourcePdf: string
  sourcePage: number
}

export interface ManifestSubject {
  code: string
  alternateCode: string | null
  legacyCodes?: string[]
  name: string
  category: string
  priority: string
  credits: number
  description: string
  coverageFocus: string
  programmeRestriction?: string
  resources: ManifestResource[]
}

export interface ManifestSemester {
  number: number
  name: string
  description: string
  subjects: ManifestSubject[]
}

export interface Manifest {
  institutionCode: string
  schemeCode: string
  schemeName: string
  semesters: ManifestSemester[]
}

// ─── Loader ─────────────────────────────────────────────────────────────────

const MANIFEST_DIR = join(process.cwd(), 'content', 'curriculum', 'cwit-r23')

/**
 * The original top-level Semester 3-6 manifest was extracted from a curated
 * YouTube guide before the official CWIT curriculum extraction was added under
 * `content/curriculum/cwit-r23/comp/`. Keep its useful resource links, but
 * correct subject identity where the official extraction is now definitive.
 */
const OFFICIAL_SUBJECT_CORRECTIONS: Record<
  string,
  Pick<ManifestSubject, 'code' | 'name' | 'category' | 'credits' | 'description' | 'coverageFocus'> & {
    legacyCodes: string[]
  }
> = {
  R23CP5401: {
    code: 'R23CP1407',
    name: 'Seminar And Capstone Initiation',
    category: 'AEC',
    credits: 1,
    description:
      'Seminar topic selection, authentic literature survey, technical presentation and Q&A, followed by real-world problem identification, feasibility study and capstone project initiation.',
    coverageFocus:
      'Topic selection, literature survey, seminar report and presentation, critical discussion, problem statement, project objectives and scope, feasibility, action planning and capstone initiation.',
    legacyCodes: ['R23CP5401'],
  },
}

let cachedManifests: Manifest[] | null = null

function loadManifests(): Manifest[] {
  if (cachedManifests) return cachedManifests
  try {
    const files = readdirSync(MANIFEST_DIR).filter((f) => f.endsWith('.json'))
    cachedManifests = files.map((f) => {
      const raw = readFileSync(join(MANIFEST_DIR, f), 'utf-8')
      const parsed = JSON.parse(raw) as Manifest
      // Normalise: the JSON manifests use `officialSubjectCode` but our
      // ManifestSubject interface expects `code`. Map it so downstream
      // lookups (getSubjectNotes(subject.code) etc.) actually work.
      for (const sem of parsed.semesters ?? []) {
        for (const subj of sem.subjects ?? []) {
          if (!subj.code && (subj as { officialSubjectCode?: string }).officialSubjectCode) {
            subj.code = (subj as { officialSubjectCode?: string }).officialSubjectCode as string
          }
          // Ensure alternateCode is null (not undefined) for type safety.
          if (subj.alternateCode === undefined) subj.alternateCode = null

          const correction = OFFICIAL_SUBJECT_CORRECTIONS[subj.code]
          if (correction) {
            // Keep alternateCode/resources/priority/programmeRestriction from
            // the resource manifest while replacing stale official metadata.
            Object.assign(subj, correction)
          }
        }
      }
      return parsed
    })
    return cachedManifests
  } catch {
    return []
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function getManifestSemester(
  programmeCode: string,
  semesterNumber: number,
): ManifestSemester | null {
  const manifests = loadManifests()
  for (const manifest of manifests) {
    for (const sem of manifest.semesters) {
      if (sem.number === semesterNumber) {
        return sem
      }
    }
  }
  return null
}

export function getManifestSubject(
  programmeCode: string,
  semesterNumber: number,
  subjectCode: string,
): ManifestSubject | null {
  const sem = getManifestSemester(programmeCode, semesterNumber)
  if (!sem) return null
  return (
    sem.subjects.find(
      (s) =>
        s.code === subjectCode ||
        s.alternateCode === subjectCode ||
        s.legacyCodes?.includes(subjectCode) ||
        (programmeCode === 'DCIOT' && s.alternateCode === subjectCode),
    ) ?? null
  )
}

export function getManifestSubjectsForSemester(
  programmeCode: string,
  semesterNumber: number,
): ManifestSubject[] {
  const sem = getManifestSemester(programmeCode, semesterNumber)
  if (!sem) return []
  return sem.subjects.filter((s) => {
    if (s.programmeRestriction && s.programmeRestriction !== programmeCode) return false
    return true
  })
}

export function getManifestLessonSlug(subject: ManifestSubject): string {
  return subject.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/**
 * Extract YouTube video ID from a YouTube URL.
 * Works with watch?v=, youtu.be/, and playlist URLs.
 */
export function extractYouTubeVideoId(url: string): string | null {
  const watchMatch = url.match(/[?&]v=([\w-]{11})/)
  if (watchMatch) return watchMatch[1]
  const shortMatch = url.match(/youtu\.be\/([\w-]{11})/)
  if (shortMatch) return shortMatch[1]
  return null
}

export function extractYouTubePlaylistId(url: string): string | null {
  const match = url.match(/[?&]list=([\w-]+)/)
  return match ? match[1] : null
}

/**
 * Build a YouTube embed URL from a resource URL.
 * For playlists: https://www.youtube.com/embed/videoseries?list=PLAYLIST_ID
 * For single videos: https://www.youtube.com/embed/VIDEO_ID
 */
export function buildYouTubeEmbedUrl(url: string): string {
  const playlistId = extractYouTubePlaylistId(url)
  const videoId = extractYouTubeVideoId(url)
  if (playlistId) {
    return `https://www.youtube-nocookie.com/embed/videoseries?list=${playlistId}&rel=0`
  }
  if (videoId) {
    return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`
  }
  return url
}

/**
 * Build a YouTube thumbnail URL from a resource URL.
 */
export function buildYouTubeThumbnailUrl(url: string): string | null {
  const videoId = extractYouTubeVideoId(url)
  if (videoId) {
    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
  }
  // For playlists, we can't easily get a thumbnail without the API
  return null
}

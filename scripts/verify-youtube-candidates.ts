import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

interface CandidateManifest {
  manifestVersion: number
  status: string
  verificationStatus: string
  candidates: YouTubeCandidate[]
  [key: string]: unknown
}

interface YouTubeCandidate {
  id: string
  canonicalUrl: string
  resourceKind: 'video' | 'playlist'
  videoId: string | null
  playlistId: string | null
  verificationStatus: string
  [key: string]: unknown
}

interface OEmbedResponse {
  title?: string
  author_name?: string
  author_url?: string
  provider_name?: string
  provider_url?: string
  thumbnail_url?: string
  thumbnail_width?: number
  thumbnail_height?: number
  type?: string
  html?: string
}

interface VerificationResult {
  method: 'youtube_oembed'
  checkedAt: string
  metadataStatus: 'found' | 'not_supported_for_playlist' | 'unavailable' | 'network_error'
  httpStatus: number | null
  title: string | null
  channel: string | null
  channelUrl: string | null
  thumbnailUrl: string | null
  providerName: string | null
  availabilityStatus: string
  embeddable: boolean
  embeddabilityStatus: string
  durationSeconds: number | null
  captionsAvailability: 'unchecked'
  ageRestrictionStatus: 'unchecked'
  playlistMembershipStatus: 'unchecked'
  errorMessage?: string
}

const defaultInput = join('content', 'resources', 'youtube-candidates', 'cwit-r23-youtube-candidates.json')
const defaultOutput = join('content', 'resources', 'youtube-candidates', 'cwit-r23-youtube-candidates.metadata.json')

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const inputPath = String(args.input ?? defaultInput)
  const outputPath = String(args.output ?? defaultOutput)
  const write = Boolean(args.write)
  const rawLimit = typeof args.limit === 'string' ? Number(args.limit) : Number(args._limit ?? NaN)
  const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? rawLimit : null

  const manifest = JSON.parse(readFileSync(inputPath, 'utf8')) as CandidateManifest
  const candidates = limit
    ? manifest.candidates.slice(0, limit)
    : manifest.candidates

  const checkedAt = new Date().toISOString()
  const verified = await mapWithConcurrency(candidates, 5, async (candidate) => ({
    ...candidate,
    metadata: await verifyCandidate(candidate, checkedAt),
    verificationStatus: 'metadata_checked_unreviewed',
    publicationStatus: 'draft',
  }))

  const unavailable = verified.filter((candidate) => candidate.metadata.metadataStatus !== 'found').length
  const output = {
    ...manifest,
    verificationStatus: 'metadata_checked_unreviewed',
    metadataCheckedAt: checkedAt,
    metadataMethod: 'youtube_oembed',
    metadataLimitApplied: limit,
    metadataSummary: {
      checked: verified.length,
      found: verified.length - unavailable,
      unavailable,
      playlistRequiresManualOrApiReview: verified.filter(
        (candidate) => candidate.metadata.metadataStatus === 'not_supported_for_playlist',
      ).length,
      durationSeconds: 'unchecked_without_youtube_data_api',
      captionsAvailability: 'unchecked_without_youtube_data_api',
      ageRestrictionStatus: 'unchecked_without_youtube_data_api',
    },
    candidates: mergeCandidates(manifest.candidates, verified),
  }

  if (write) {
    mkdirSync(dirname(outputPath), { recursive: true })
    writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
    console.warn(`[youtube-verify] wrote ${verified.length} metadata check(s) to ${outputPath}`)
  } else {
    console.warn(`[youtube-verify] dry-run checked ${verified.length} candidate(s); use --write to emit ${outputPath}`)
  }
  console.warn(`[youtube-verify] found=${verified.length - unavailable} unavailable_or_unchecked=${unavailable}`)
}

async function verifyCandidate(candidate: YouTubeCandidate, checkedAt: string): Promise<VerificationResult> {
  if (candidate.resourceKind === 'playlist') {
    return {
      method: 'youtube_oembed',
      checkedAt,
      metadataStatus: 'not_supported_for_playlist',
      httpStatus: null,
      title: null,
      channel: null,
      channelUrl: null,
      thumbnailUrl: null,
      providerName: null,
      availabilityStatus: 'playlist_requires_youtube_data_api_or_manual_review',
      embeddable: false,
      embeddabilityStatus: 'unchecked_playlist',
      durationSeconds: null,
      captionsAvailability: 'unchecked',
      ageRestrictionStatus: 'unchecked',
      playlistMembershipStatus: 'unchecked',
    }
  }

  const endpoint = new URL('https://www.youtube.com/oembed')
  endpoint.searchParams.set('url', candidate.canonicalUrl)
  endpoint.searchParams.set('format', 'json')

  try {
    const response = await fetchWithTimeout(endpoint, 8000)
    if (!response.ok) {
      return {
        method: 'youtube_oembed',
        checkedAt,
        metadataStatus: 'unavailable',
        httpStatus: response.status,
        title: null,
        channel: null,
        channelUrl: null,
        thumbnailUrl: null,
        providerName: null,
        availabilityStatus: `oembed_http_${response.status}`,
        embeddable: false,
        embeddabilityStatus: 'oembed_unavailable',
        durationSeconds: null,
        captionsAvailability: 'unchecked',
        ageRestrictionStatus: 'unchecked',
        playlistMembershipStatus: 'unchecked',
      }
    }

    const metadata = await response.json() as OEmbedResponse
    return {
      method: 'youtube_oembed',
      checkedAt,
      metadataStatus: 'found',
      httpStatus: response.status,
      title: metadata.title ?? null,
      channel: metadata.author_name ?? null,
      channelUrl: metadata.author_url ?? null,
      thumbnailUrl: metadata.thumbnail_url ?? null,
      providerName: metadata.provider_name ?? null,
      availabilityStatus: 'public_oembed_available',
      embeddable: true,
      embeddabilityStatus: 'oembed_available_not_reviewer_approved',
      durationSeconds: null,
      captionsAvailability: 'unchecked',
      ageRestrictionStatus: 'unchecked',
      playlistMembershipStatus: 'unchecked',
    }
  } catch (error) {
    return {
      method: 'youtube_oembed',
      checkedAt,
      metadataStatus: 'network_error',
      httpStatus: null,
      title: null,
      channel: null,
      channelUrl: null,
      thumbnailUrl: null,
      providerName: null,
      availabilityStatus: 'metadata_check_failed',
      embeddable: false,
      embeddabilityStatus: 'unchecked_network_error',
      durationSeconds: null,
      captionsAvailability: 'unchecked',
      ageRestrictionStatus: 'unchecked',
      playlistMembershipStatus: 'unchecked',
      errorMessage: error instanceof Error ? error.message : 'Unknown metadata error',
    }
  }
}

async function fetchWithTimeout(url: URL, timeoutMs: number) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
  } finally {
    clearTimeout(timer)
  }
}

function mergeCandidates(original: YouTubeCandidate[], verified: Array<YouTubeCandidate & { metadata: VerificationResult }>) {
  const byId = new Map(verified.map((candidate) => [candidate.id, candidate]))
  return original.map((candidate) => byId.get(candidate.id) ?? candidate)
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = []
  let index = 0

  async function run() {
    while (index < items.length) {
      const currentIndex = index
      index += 1
      results[currentIndex] = await worker(items[currentIndex])
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run))
  return results
}

function parseArgs(args: string[]) {
  const parsed: Record<string, string | boolean> = {}
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (!arg.startsWith('--')) {
      if (/^\d+$/.test(arg) && parsed._limit === undefined) parsed._limit = arg
      continue
    }
    const key = arg.slice(2)
    const next = args[index + 1]
    if (!next || next.startsWith('--')) {
      parsed[key] = true
    } else {
      parsed[key] = next
      index += 1
    }
  }
  return parsed
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

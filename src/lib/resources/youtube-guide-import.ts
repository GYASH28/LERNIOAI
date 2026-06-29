import { createHash } from 'node:crypto'
import { canonicalizeYouTubeUrl } from './lesson-resource-policy'

export interface ExtractedGuideUrl {
  page: number
  url: string
}

export interface ExtractedGuidePage {
  page: number
  text: string
}

export interface ExtractedGuideSource {
  sourceId: string
  title: string
  localPdf: string
  pages: ExtractedGuidePage[]
  urls: ExtractedGuideUrl[]
}

export interface YouTubeGuideCandidateManifestInput {
  sources: ExtractedGuideSource[]
  generatedAt?: string
}

export function buildYouTubeGuideCandidateManifest(input: YouTubeGuideCandidateManifestInput) {
  const sources = input.sources.map((source) => ({
    ...source,
    urls: dedupeSourceUrls(source.urls),
  }))
  const extractedUrls = sources.flatMap((source) =>
    source.urls.map((entry) => ({
      ...entry,
      sourceId: source.sourceId,
    })),
  )
  const candidates = sources.flatMap((source) => buildCandidatesForSource(source))
  const uniqueCandidates = Array.from(
    new Map(candidates.map((candidate) => [candidate.id, candidate])).values(),
  ).sort((a, b) =>
    a.sourceId.localeCompare(b.sourceId) ||
    a.sourcePage - b.sourcePage ||
    a.canonicalUrl.localeCompare(b.canonicalUrl),
  )

  return {
    manifestVersion: 1,
    status: 'draft',
    verificationStatus: 'pending_metadata_verification',
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    sourceUrlCount: extractedUrls.length,
    uniqueSourceUrlCount: new Set(extractedUrls.map((entry) => entry.url)).size,
    sourceHierarchyNote:
      'These YouTube links are candidate resources only. They must be metadata checked, mapped to verified lessons and reviewed before publication.',
    sources: sources.map((source) => ({
      sourceId: source.sourceId,
      title: source.title,
      localPdf: source.localPdf,
    })),
    skippedUrls: extractedUrls
      .filter((entry) => !canonicalizeYouTubeUrl(entry.url))
      .map((entry) => ({
        sourceId: entry.sourceId,
        sourcePage: entry.page,
        url: entry.url,
        reason: 'not_youtube_resource',
      })),
    candidates: uniqueCandidates,
  }
}

export function extractedTextForPages(pages: ExtractedGuidePage[]): string {
  return pages
    .slice()
    .sort((a, b) => a.page - b.page)
    .map((page) => `--- page ${page.page} ---\n${page.text.trim()}\n`)
    .join('\n')
}

function dedupeSourceUrls(urls: ExtractedGuideUrl[]): ExtractedGuideUrl[] {
  const seen = new Set<string>()
  return urls.filter((entry) => {
    if (seen.has(entry.url)) return false
    seen.add(entry.url)
    return true
  })
}

function buildCandidatesForSource(source: ExtractedGuideSource) {
  const pageText = new Map(source.pages.map((page) => [page.page, page.text]))

  return source.urls.flatMap((entry, index) => {
    const page = pageText.get(entry.page) ?? ''
    const canonical = canonicalizeYouTubeUrl(entry.url)
    if (!canonical) return []
    const subjectCodes = Array.from(new Set(page.match(/R23(?:CP|CI)\d{4}/g) ?? [])).sort()
    const programmeCodes = Array.from(new Set(subjectCodes.map(programmeForSubjectCode).filter(Boolean))).sort()
    const subjectTitle = inferSubjectTitle(page)
    const role = inferResourceRole(page, entry.url)

    return [{
      id: candidateId(source.sourceId, entry.page, index, canonical.canonicalUrl),
      sourceId: source.sourceId,
      sourcePage: entry.page,
      sourcePdf: source.localPdf,
      originalUrl: entry.url,
      canonicalUrl: canonical.canonicalUrl,
      resourceKind: canonical.kind,
      externalId: canonical.externalId,
      videoId: canonical.videoId,
      playlistId: canonical.playlistId,
      role,
      subjectTitle,
      officialSubjectCodes: subjectCodes,
      programmeCodes,
      verificationStatus: 'pending_metadata_verification',
      publicationStatus: 'draft',
    }]
  })
}

function inferSubjectTitle(page: string): string | null {
  const lines = cleanedLines(page)
  const codeIndex = lines.findIndex((line) => /R23(?:CP|CI)\d{4}/.test(line))
  const beforeCode = codeIndex >= 0 ? lines.slice(0, codeIndex).reverse() : lines.slice(0, 12).reverse()
  const ignored = /^(SEMESTER|HIGH PRIORITY|IMPORTANT|SKILL SUPPORT|PRACTICAL|PRIMARY|ALTERNATE|CP ONLY|CI ONLY|\d+)$/
  const title = beforeCode.find((line) =>
    !ignored.test(line.toUpperCase()) &&
    !line.toLowerCase().startsWith('shared by') &&
    !line.toLowerCase().startsWith('coverage focus') &&
    !line.toLowerCase().startsWith('cwit r23'),
  )
  return title ?? null
}

function inferResourceRole(page: string, url: string): string {
  const lines = cleanedLines(page)
  const urlIndex = lines.findIndex((line) => line.includes(url))
  const context = lines.slice(Math.max(0, urlIndex - 8), Math.max(0, urlIndex)).join(' ').toUpperCase()
  if (context.includes('PRIMARY')) return 'primary_video'
  if (context.includes('ALTERNATE')) return 'alternate_video'
  if (context.includes('PRACTICAL') || context.includes('LAB')) return 'lab_demo'
  return 'reference'
}

function cleanedLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function programmeForSubjectCode(code: string): string | null {
  if (code.startsWith('R23CP')) return 'DCOMP'
  if (code.startsWith('R23CI')) return 'DCIOT'
  return null
}

function candidateId(sourceId: string, page: number, index: number, canonicalUrl: string): string {
  const hash = createHash('sha1').update(`${sourceId}:${page}:${index}:${canonicalUrl}`).digest('hex').slice(0, 12)
  return `ytcand_${hash}`
}

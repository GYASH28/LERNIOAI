import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { canonicalizeYouTubeUrl } from '../src/lib/resources/lesson-resource-policy'

interface ExtractedUrl {
  page: number
  url: string
}

interface SourcePdf {
  sourceId: string
  title: string
  localPdf: string
  extractedText: string
  extractedUrls: string
}

const SOURCES: SourcePdf[] = [
  {
    sourceId: 'cwit-youtube-sem-1-2',
    title: 'CWIT Semester 1 and 2 YouTube Lecture Guide',
    localPdf: 'content-import/CWIT_Semester_1_2_YouTube_Lecture_Links.pdf',
    extractedText: 'tmp/pdfs/CWIT_Semester_1_2_YouTube_Lecture_Links.txt',
    extractedUrls: 'tmp/pdfs/CWIT_Semester_1_2_YouTube_Lecture_Links.urls.json',
  },
  {
    sourceId: 'cwit-youtube-sem-3-6',
    title: 'CWIT Semester 3 to 6 YouTube Lecture Guide',
    localPdf: 'content-import/CWIT_Semester_3_to_6_YouTube_Lecture_Links.pdf',
    extractedText: 'tmp/pdfs/CWIT_Semester_3_to_6_YouTube_Lecture_Links.txt',
    extractedUrls: 'tmp/pdfs/CWIT_Semester_3_to_6_YouTube_Lecture_Links.urls.json',
  },
]

const outputPath = join('content', 'resources', 'youtube-candidates', 'cwit-r23-youtube-candidates.json')

const extractedUrls = SOURCES.flatMap((source) =>
  (JSON.parse(readFileSync(source.extractedUrls, 'utf8')) as ExtractedUrl[]).map((entry) => ({
    ...entry,
    sourceId: source.sourceId,
  })),
)
const candidates = SOURCES.flatMap((source) => buildCandidatesForSource(source))
const uniqueCandidates = Array.from(
  new Map(candidates.map((candidate) => [candidate.id, candidate])).values(),
).sort((a, b) =>
  a.sourceId.localeCompare(b.sourceId) ||
  a.sourcePage - b.sourcePage ||
  a.canonicalUrl.localeCompare(b.canonicalUrl),
)

const manifest = {
  manifestVersion: 1,
  status: 'draft',
  verificationStatus: 'pending_metadata_verification',
  generatedAt: new Date().toISOString(),
  sourceUrlCount: extractedUrls.length,
  uniqueSourceUrlCount: new Set(extractedUrls.map((entry) => entry.url)).size,
  sourceHierarchyNote:
    'These YouTube links are candidate resources only. They must be metadata checked, mapped to verified lessons and reviewed before publication.',
  sources: SOURCES.map((source) => ({
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

mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
console.warn(`[youtube-candidates] wrote ${uniqueCandidates.length} candidate(s) to ${outputPath}`)

function buildCandidatesForSource(source: SourcePdf) {
  const pageText = parsePages(readFileSync(source.extractedText, 'utf8'))
  const urls = JSON.parse(readFileSync(source.extractedUrls, 'utf8')) as ExtractedUrl[]

  return urls.flatMap((entry, index) => {
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

function parsePages(text: string): Map<number, string> {
  const pages = new Map<number, string>()
  const pagePattern = /--- page (\d+) ---\r?\n([\s\S]*?)(?=\r?\n--- page \d+ ---|$)/g
  let match: RegExpExecArray | null
  while ((match = pagePattern.exec(text)) !== null) {
    pages.set(Number(match[1]), match[2])
  }
  return pages
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

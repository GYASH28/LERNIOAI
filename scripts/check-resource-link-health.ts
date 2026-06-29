import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import {
  classifyLinkHealth,
  summarizeLinkHealth,
  type LinkHealthCheckResult,
} from '../src/lib/resources/link-health'

interface CandidateManifest {
  candidates: CandidateResource[]
  [key: string]: unknown
}

interface CandidateResource {
  id: string
  canonicalUrl: string
  resourceKind?: string
  subjectTitle?: string | null
  officialSubjectCodes?: string[]
  programmeCodes?: string[]
  publicationStatus?: string
  verificationStatus?: string
}

interface LinkHealthReportRow extends LinkHealthCheckResult {
  id: string
  resourceKind: string | null
  subjectTitle: string | null
  officialSubjectCodes: string[]
  programmeCodes: string[]
  publicationStatus: string | null
  verificationStatus: string | null
}

const defaultInput = join('content', 'resources', 'youtube-candidates', 'cwit-r23-youtube-candidates.metadata.json')
const fallbackInput = join('content', 'resources', 'youtube-candidates', 'cwit-r23-youtube-candidates.json')
const defaultOutput = join('content', 'reports', 'cwit-r23-link-health.json')

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const inputPath = String(args.input ?? defaultInput)
  const outputPath = String(args.output ?? defaultOutput)
  const write = Boolean(args.write)
  const timeoutMs = numberArg(args.timeout, 8000)
  const concurrency = Math.max(1, Math.min(numberArg(args.concurrency, 5), 10))
  const rawLimit = typeof args.limit === 'string' ? Number(args.limit) : Number(args._limit ?? NaN)
  const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? rawLimit : null

  const manifest = readCandidateManifest(inputPath)
  const candidates = limit ? manifest.candidates.slice(0, limit) : manifest.candidates
  const checkedAt = new Date().toISOString()
  const rows = await mapWithConcurrency(candidates, concurrency, async (candidate) => {
    const health = await checkUrl(candidate.canonicalUrl, checkedAt, timeoutMs)
    return {
      ...health,
      id: candidate.id,
      resourceKind: candidate.resourceKind ?? null,
      subjectTitle: candidate.subjectTitle ?? null,
      officialSubjectCodes: candidate.officialSubjectCodes ?? [],
      programmeCodes: candidate.programmeCodes ?? [],
      publicationStatus: candidate.publicationStatus ?? null,
      verificationStatus: candidate.verificationStatus ?? null,
    } satisfies LinkHealthReportRow
  })

  const output = {
    manifestVersion: 1,
    generatedAt: checkedAt,
    source: inputPath,
    status: 'report_only',
    note: 'This report checks URL reachability only. YouTube playlists still require YouTube Data API or manual review for membership, duration, captions and embeddability.',
    limitApplied: limit,
    timeoutMs,
    summary: summarizeLinkHealth(rows),
    resources: rows,
  }

  if (write) {
    mkdirSync(dirname(outputPath), { recursive: true })
    writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
    console.warn(`[link-health] wrote ${rows.length} row(s) to ${relative(process.cwd(), outputPath).replaceAll('\\', '/')}`)
  } else {
    console.warn(`[link-health] dry-run checked ${rows.length} row(s); use --write to emit ${outputPath}`)
  }
  console.warn(`[link-health] ${JSON.stringify(output.summary)}`)
}

function readCandidateManifest(inputPath: string): CandidateManifest {
  try {
    return JSON.parse(readFileSync(inputPath, 'utf8')) as CandidateManifest
  } catch (error) {
    if (inputPath === defaultInput) {
      return JSON.parse(readFileSync(fallbackInput, 'utf8')) as CandidateManifest
    }
    throw error
  }
}

async function checkUrl(url: string, checkedAt: string, timeoutMs: number): Promise<LinkHealthCheckResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'LernioAI-LinkHealth/1.0',
      },
    })
    const finalUrl = response.url || url
    return {
      checkedAt,
      url,
      finalUrl,
      status: classifyLinkHealth({
        httpStatus: response.status,
        originalUrl: url,
        finalUrl,
      }),
      httpStatus: response.status,
    }
  } catch (error) {
    return {
      checkedAt,
      url,
      finalUrl: null,
      status: 'unknown',
      httpStatus: null,
      errorMessage: error instanceof Error ? error.message : 'Unknown link-health error',
    }
  } finally {
    clearTimeout(timer)
  }
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

function numberArg(value: string | boolean | undefined, fallback: number): number {
  if (typeof value !== 'string') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
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

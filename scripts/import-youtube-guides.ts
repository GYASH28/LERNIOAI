import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { basename, dirname, isAbsolute, join, relative } from 'node:path'
import { spawnSync } from 'node:child_process'
import {
  buildYouTubeGuideCandidateManifest,
  extractedTextForPages,
  type ExtractedGuidePage,
  type ExtractedGuideUrl,
} from '../src/lib/resources/youtube-guide-import'

interface SourceConfig {
  sourceId: string
  title: string
  localPdf: string
}

interface ExtractedPdf {
  pages: ExtractedGuidePage[]
  urls: ExtractedGuideUrl[]
}

const root = process.cwd()
const defaultOutput = join(root, 'content', 'resources', 'youtube-candidates', 'cwit-r23-youtube-candidates.json')
const defaultTmpDir = join(root, 'tmp', 'pdfs')
const args = parseArgs(process.argv.slice(2))
const positional = Array.isArray(args._) ? args._ : []
const write = args.write === true && args['dry-run'] !== true
const outputPath = resolvePath(stringArg(args.output) ?? defaultOutput)
const tmpDir = resolvePath(stringArg(args['tmp-dir']) ?? defaultTmpDir)
const generatedAt = stringArg(args['generated-at'])

const sources: SourceConfig[] = [
  {
    sourceId: 'cwit-youtube-sem-1-2',
    title: 'CWIT Semester 1 and 2 YouTube Lecture Guide',
    localPdf: resolvePath(
      stringArg(args.sem12) ??
        positional[0] ??
        join(root, 'content-import', 'CWIT_Semester_1_2_YouTube_Lecture_Links.pdf'),
    ),
  },
  {
    sourceId: 'cwit-youtube-sem-3-6',
    title: 'CWIT Semester 3 to 6 YouTube Lecture Guide',
    localPdf: resolvePath(
      stringArg(args.sem36) ??
        positional[1] ??
        join(root, 'content-import', 'CWIT_Semester_3_to_6_YouTube_Lecture_Links.pdf'),
    ),
  },
]

async function main() {
  for (const source of sources) {
    if (!existsSync(source.localPdf)) {
      throw new Error(`Missing source PDF: ${relative(root, source.localPdf)}`)
    }
  }

  const extractedSources = sources.map((source) => {
    const extracted = extractPdf(source.localPdf)
    return {
      ...source,
      localPdf: relative(root, source.localPdf).replaceAll('\\', '/'),
      pages: extracted.pages,
      urls: extracted.urls,
    }
  })

  const manifest = buildYouTubeGuideCandidateManifest({
    sources: extractedSources,
    generatedAt: generatedAt ?? undefined,
  })
  const summary = {
    mode: write ? 'write' : 'dry-run',
    sources: extractedSources.map((source) => ({
      sourceId: source.sourceId,
      pages: source.pages.length,
      extractedUrls: source.urls.length,
      uniqueUrls: new Set(source.urls.map((entry) => entry.url)).size,
    })),
    output: relative(root, outputPath).replaceAll('\\', '/'),
    sourceUrlCount: manifest.sourceUrlCount,
    uniqueSourceUrlCount: manifest.uniqueSourceUrlCount,
    candidates: manifest.candidates.length,
    skippedUrls: manifest.skippedUrls.length,
  }

  if (write) {
    mkdirSync(dirname(outputPath), { recursive: true })
    mkdirSync(tmpDir, { recursive: true })
    for (const source of extractedSources) {
      const base = basename(source.localPdf, '.pdf')
      writeFileSync(join(tmpDir, `${base}.txt`), extractedTextForPages(source.pages), 'utf8')
      writeFileSync(join(tmpDir, `${base}.urls.json`), `${JSON.stringify(source.urls, null, 2)}\n`, 'utf8')
    }
    writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
    console.warn(`[youtube-guide-import] wrote ${manifest.candidates.length} candidate(s) to ${summary.output}`)
  } else {
    console.warn(`[youtube-guide-import] dry-run built ${manifest.candidates.length} candidate(s); use --write to emit ${summary.output}`)
  }
  console.warn(JSON.stringify(summary, null, 2))
}

function extractPdf(pdfPath: string): ExtractedPdf {
  const result = spawnSync('python', ['-c', PYTHON_EXTRACTOR, pdfPath], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`PDF extraction failed for ${relative(root, pdfPath)}:\n${result.stderr || result.stdout}`)
  }
  return JSON.parse(result.stdout) as ExtractedPdf
}

function parseArgs(argv: string[]) {
  const parsed: Record<string, string | boolean | string[]> = { _: [] }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (!arg.startsWith('--')) {
      ;(parsed._ as string[]).push(arg)
      continue
    }
    const key = arg.slice(2)
    const next = argv[index + 1]
    if (!next || next.startsWith('--')) {
      parsed[key] = true
    } else {
      parsed[key] = next
      index += 1
    }
  }
  return parsed
}

function stringArg(value: string | boolean | string[] | undefined): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function resolvePath(value: string): string {
  return isAbsolute(value) ? value : join(root, value)
}

const PYTHON_EXTRACTOR = String.raw`
import json
import re
import sys

try:
    import pdfplumber
    from pypdf import PdfReader
except Exception as exc:
    raise SystemExit(f"pdfplumber and pypdf are required for guide extraction: {exc}")

pdf_path = sys.argv[1]
url_re = re.compile(r"https?://[^\s<>'\"()]+")

def clean_url(value):
    return value.strip().rstrip(".,;:]}")

def page_text_urls(text):
    return [clean_url(match.group(0)) for match in url_re.finditer(text or "")]

def annotation_urls(path):
    by_page = {}
    reader = PdfReader(path)
    for page_number, page in enumerate(reader.pages, start=1):
        urls = []
        for annotation_ref in page.get("/Annots") or []:
            annotation = annotation_ref.get_object()
            uri = annotation.get("/URI")
            action = annotation.get("/A")
            if not uri and action:
                try:
                    uri = action.get_object().get("/URI")
                except Exception:
                    uri = action.get("/URI") if hasattr(action, "get") else None
            if uri:
                urls.append(clean_url(str(uri)))
        by_page[page_number] = urls
    return by_page

pages = []
urls = []
annot_urls = annotation_urls(pdf_path)

with pdfplumber.open(pdf_path) as pdf:
    for index, page in enumerate(pdf.pages, start=1):
        text = page.extract_text(x_tolerance=1, y_tolerance=3) or ""
        pages.append({"page": index, "text": text})
        seen = set()
        for url in page_text_urls(text) + annot_urls.get(index, []):
            if not url or url in seen:
                continue
            seen.add(url)
            urls.append({"page": index, "url": url})

print(json.dumps({"pages": pages, "urls": urls}, ensure_ascii=False))
`

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

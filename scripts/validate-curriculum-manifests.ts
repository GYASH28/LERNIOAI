import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { validateCurriculumManifest } from '../src/lib/curriculum/manifest-validation'

const root = process.cwd()
const manifestsRoot = join(root, 'content', 'curriculum', 'cwit-r23')
const files = findManifestFiles(manifestsRoot)

if (files.length === 0) {
  console.error('[curriculum] No curriculum manifests found.')
  process.exit(1)
}

const errors: string[] = []
for (const file of files) {
  const label = relative(root, file).replaceAll('\\', '/')
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as unknown
    const result = validateCurriculumManifest(parsed, label)
    if (!result.valid) errors.push(...result.errors)
  } catch (error) {
    errors.push(`${label}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

if (errors.length > 0) {
  console.error(`[curriculum] ${errors.length} validation error(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.warn(`[curriculum] ${files.length} manifest(s) valid.`)

function findManifestFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    if (statSync(fullPath).isDirectory()) {
      out.push(...findManifestFiles(fullPath))
    } else if (/semester-\d+\.json$/.test(entry)) {
      out.push(fullPath)
    }
  }
  return out.sort()
}

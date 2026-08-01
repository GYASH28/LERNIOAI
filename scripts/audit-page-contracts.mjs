import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'

const root = process.cwd()
const appRoot = resolve(root, 'src/app')
const failures = []
const warnings = []

function walk(directory) {
  if (!existsSync(directory)) return []
  return readdirSync(directory).flatMap((entry) => {
    const absolute = resolve(directory, entry)
    return statSync(absolute).isDirectory() ? walk(absolute) : [absolute]
  })
}

function source(file) {
  return readFileSync(file, 'utf8')
}

function repoPath(file) {
  return relative(root, file).split(sep).join('/')
}

function routeFromPage(file) {
  const path = relative(appRoot, file).split(sep).join('/').replace(/\/page\.(tsx|ts|jsx|js)$/, '')
  if (!path || path === 'page.tsx' || path === 'page.ts' || path === 'page.jsx' || path === 'page.js') return '/'
  const segments = path.split('/').filter(Boolean).filter((segment) => !/^\(.+\)$/.test(segment))
  return `/${segments.join('/')}`
}

function routeRegex(route) {
  if (route === '/') return /^\/$/
  const escaped = route
    .split('/')
    .filter(Boolean)
    .map((segment) => {
      if (/^\[\.\.\..+\]$/.test(segment)) return '.+'
      if (/^\[\[\.\.\..+\]\]$/.test(segment)) return '.*'
      if (/^\[.+\]$/.test(segment)) return '[^/]+'
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    })
    .join('/')
  return new RegExp(`^/${escaped}/?$`)
}

const files = walk(appRoot)
const pages = files.filter((file) => /\/page\.(tsx|ts|jsx|js)$/.test(file))
const routes = pages.map((file) => ({ file, path: routeFromPage(file) }))
const routeMatchers = routes.map((route) => ({ ...route, regex: routeRegex(route.path) }))

for (const { file, path } of routes) {
  const text = source(file)
  const display = repoPath(file)

  if (display.startsWith('src/app/learn/') && /from ['"]@\/components\/layout\/(top-bar|footer)['"]/.test(text)) {
    failures.push(`${display}: Learn child pages must not mount TopBar or Footer; LearnShell owns navigation chrome.`)
  }

  if (/href\s*=\s*["'`]#(?:["'`])/.test(text)) {
    failures.push(`${display}: contains href="#" dead navigation.`)
  }
  if (/href\s*=\s*["'`]javascript:/i.test(text)) {
    failures.push(`${display}: contains a javascript: link.`)
  }
  if (/onClick\s*=\s*\{\s*\(.*?\)\s*=>\s*\{\s*\}\s*\}/s.test(text)) {
    failures.push(`${display}: contains an empty click handler.`)
  }
  if (/\bcoming soon\b/i.test(text) && !display.includes('/admin/')) {
    warnings.push(`${display}: contains student-visible "coming soon" copy; verify it is intentional.`)
  }

  const hrefPattern = /href\s*=\s*["'`]([^"'`]+)["'`]/g
  for (const match of text.matchAll(hrefPattern)) {
    const rawHref = match[1]
    if (!rawHref.startsWith('/') || rawHref.startsWith('//') || rawHref.startsWith('/api/')) continue
    if (rawHref.includes('${') || rawHref.includes('{') || rawHref.includes('[')) continue
    const pathname = rawHref.split(/[?#]/)[0] || '/'
    const exists = routeMatchers.some((candidate) => candidate.regex.test(pathname))
    if (!exists) failures.push(`${display}: internal link ${rawHref} does not match an App Router page.`)
  }

  if (path.startsWith('/learn/') && path !== '/learn/current') {
    const routeDirectory = resolve(file, '..')
    const hasLocalError = existsSync(resolve(routeDirectory, 'error.tsx'))
    const hasInheritedError = existsSync(resolve(appRoot, 'learn', 'error.tsx'))
    if (!hasLocalError && !hasInheritedError) {
      failures.push(`${display}: Learn route has no local or inherited error boundary.`)
    }
  }
}

const learnLayout = resolve(appRoot, 'learn', 'layout.tsx')
const learnHome = resolve(appRoot, 'learn', 'page.tsx')
const rootLayout = resolve(appRoot, 'layout.tsx')
const learnError = resolve(appRoot, 'learn', 'error.tsx')

if (!existsSync(learnLayout) || !source(learnLayout).includes('LearnShell')) {
  failures.push('src/app/learn/layout.tsx must delegate Learn chrome to LearnShell.')
}
if (existsSync(learnHome) && /<TopBar\b|<Footer\b/.test(source(learnHome))) {
  failures.push('src/app/learn/page.tsx mounts duplicate navigation chrome.')
}
if (!existsSync(learnError)) failures.push('src/app/learn/error.tsx is required for recoverable Learn failures.')
if (existsSync(rootLayout)) {
  const text = source(rootLayout)
  if (!text.includes('GlobalClientRuntime')) {
    failures.push('src/app/layout.tsx must use GlobalClientRuntime for route-split app tooling.')
  }
  for (const forbidden of ['StudentMobileDock', 'StudentOSLauncher', 'SelectionLearningTools', 'CommandPalette', 'KeyboardShortcuts']) {
    const directImport = new RegExp(`import\\s+\\{?\\s*${forbidden}[^\n]*from`)
    if (directImport.test(text)) {
      failures.push(`src/app/layout.tsx directly imports ${forbidden}; keep it deferred in GlobalClientRuntime.`)
    }
  }
}

const compositionSource = resolve(root, 'motion/hyperframes/lernio-opening.html')
const compositionRuntime = resolve(root, 'public/hyperframes/lernio-opening/index.html')

for (const compositionPath of [compositionSource, compositionRuntime]) {
  const display = repoPath(compositionPath)
  if (!existsSync(compositionPath)) {
    failures.push(`${display}: missing HyperFrames composition.`)
    continue
  }
  const text = source(compositionPath)
  const sharedMarkers = [
    'data-composition-id="lernio-opening-v2"',
    'data-width="1920"',
    'data-height="1080"',
    'class="scene clip"',
    'data-track-index="0"',
  ]
  for (const marker of sharedMarkers) {
    if (!text.includes(marker)) failures.push(`${display}: missing required HyperFrames marker ${marker}.`)
  }
  if (/repeat\s*:\s*-1/.test(text)) failures.push(`${display}: infinite repeats are not deterministic.`)
  if (/Math\.random\(|Date\.now\(/.test(text)) failures.push(`${display}: contains non-deterministic runtime values.`)
  const scenes = [...text.matchAll(/class="scene clip"[^>]*data-start="([\d.]+)"[^>]*data-duration="([\d.]+)"[^>]*data-track-index="(\d+)"/g)]
  if (scenes.length < 3) failures.push(`${display}: expected at least three timed scenes.`)
}

if (existsSync(compositionSource)) {
  const text = source(compositionSource)
  for (const marker of ["window.__timelines['lernio-opening-v2']", 'gsap.timeline({ paused: true']) {
    if (!text.includes(marker)) failures.push(`motion/hyperframes/lernio-opening.html: missing editable HyperFrames source marker ${marker}.`)
  }
}

if (existsSync(compositionRuntime)) {
  const text = source(compositionRuntime)
  if (/https?:\/\//.test(text)) {
    failures.push('public/hyperframes/lernio-opening/index.html: runtime must be self-contained and make no external requests.')
  }
  if (!text.includes("type: 'lernio-hyperframes-complete'")) {
    failures.push('public/hyperframes/lernio-opening/index.html: runtime must notify the app when playback completes.')
  }
}

const uniqueFailures = [...new Set(failures)]
const uniqueWarnings = [...new Set(warnings)]

console.log(`Page contract audit: ${routes.length} pages across ${files.length} App Router files.`)
if (uniqueWarnings.length) {
  console.warn(`\nWarnings (${uniqueWarnings.length}):`)
  uniqueWarnings.forEach((warning) => console.warn(`- ${warning}`))
}
if (uniqueFailures.length) {
  console.error(`\nFailures (${uniqueFailures.length}):`)
  uniqueFailures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}
console.log('Page contract audit passed.')

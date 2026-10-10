#!/usr/bin/env node
// Usage: node scripts/verify-canonical-release.mjs <expected-40-char-git-sha>
// Verifies the *public alias*, not a similarly named Vercel project.
const expected = (process.argv[2] ?? '').trim().toLowerCase()
if (!/^[a-f0-9]{40}$/.test(expected)) {
  console.error('Pass the expected full 40-character Git commit SHA.')
  process.exit(2)
}

const url = 'https://lernioai.vercel.app/api/release'
let response
try {
  response = await fetch(url, {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache' },
    signal: AbortSignal.timeout(15000),
  })
} catch (error) {
  console.error('Cannot connect to the canonical Lernio release endpoint:', error instanceof Error ? error.message : String(error))
  process.exit(1)
}

if (!response.ok) {
  console.error(`Canonical domain returned HTTP ${response.status}; deployment not verified.`)
  process.exit(1)
}

let info
try {
  info = await response.json()
} catch {
  console.error('Canonical domain did not return valid release JSON.')
  process.exit(1)
}

if (info?.app !== 'lernio' || info?.stage !== 'production' || info?.revision !== expected) {
  console.error('Incorrect or unverifiable production release. No success claimed.')
  console.error('Expected revision:', expected)
  console.error('Public revision:', info?.revision ?? 'not exposed (or old build missing release endpoint)')
  console.error('Public release stage:', info?.stage ?? 'unknown')
  process.exit(1)
}

console.log('Verified canonical Lernio production deployment:', expected)

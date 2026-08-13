import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const filePath = join(process.cwd(), 'content', 'resources', 'lesson-video-mappings', 'cwit-r23-pending-video-reconciliation.json')
const document = JSON.parse(readFileSync(filePath, 'utf8'))
const checkedAt = new Date().toISOString()
let cursor = 0

await Promise.all(Array.from({ length: 8 }, async () => {
  while (cursor < document.reconciled.length) {
    const index = cursor++
    const candidate = document.reconciled[index]
    const metadata = await oembed(candidate.videoId)
    if (metadata) {
      candidate.title = metadata.title || candidate.title
      candidate.channel = metadata.author_name || candidate.channel
      candidate.channelUrl = metadata.author_url || candidate.channelUrl || null
      candidate.oembedStatus = 'found'
      candidate.oembedVerifiedAt = checkedAt
      candidate.embeddabilityStatus = 'pending_player_verification'
    } else {
      candidate.oembedStatus = 'not_found'
      candidate.oembedVerifiedAt = checkedAt
      candidate.embeddabilityStatus = 'unavailable_or_pending_manual_verification'
    }
    if ((index + 1) % 50 === 0) console.warn(`[youtube-oembed] checked ${index + 1}/${document.reconciled.length}`)
  }
}))

const found = document.reconciled.filter((candidate) => candidate.oembedStatus === 'found').length
document.metadataVerification = {
  checkedAt,
  method: 'YouTube oEmbed identity and public metadata lookup',
  checkedCandidates: document.reconciled.length,
  found,
  notFound: document.reconciled.length - found,
  limitation: 'oEmbed confirms public video identity at check time; a named reviewer must still test the embedded player, spoken language, restrictions, captions, timestamps and exact curriculum depth.',
}
writeFileSync(filePath, `${JSON.stringify(document, null, 2)}\n`, 'utf8')
console.warn(`[youtube-oembed] found ${found}/${document.reconciled.length} direct videos`)
if (found !== document.reconciled.length) process.exitCode = 2

async function oembed(videoId) {
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; LernioCurriculumResearch/2.0)' },
        signal: AbortSignal.timeout(12_000),
      })
      if (response.ok) return await response.json()
      if (response.status === 401 || response.status === 404) return null
    } catch {
      // Retry transient network and timeout failures.
    }
    await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)))
  }
  return null
}

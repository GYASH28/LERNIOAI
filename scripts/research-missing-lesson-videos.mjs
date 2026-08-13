import { readFileSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = process.cwd()
const inputPath = join(root, 'content', 'resources', 'youtube-candidates', 'cwit-r23-missing-lesson-video-research-queue.json')
const outputPath = join(root, 'content', 'resources', 'lesson-video-mappings', 'cwit-r23-researched-gap-video-mappings.json')
const overridesPath = join(root, 'content', 'resources', 'lesson-video-mappings', 'cwit-r23-gap-video-curation-overrides.json')
const queue = JSON.parse(readFileSync(inputPath, 'utf8'))
const curation = exists(overridesPath) ? JSON.parse(readFileSync(overridesPath, 'utf8')) : { overrides: [] }
const concurrency = Math.max(1, Math.min(8, Number.parseInt(process.env.LERNIO_VIDEO_RESEARCH_CONCURRENCY ?? '4', 10) || 4))
const repairMode = process.argv.includes('--repair')
const curateOnly = process.argv.includes('--curate-only')

const REPAIR_QUERIES = new Map(Object.entries({
  'R23CP2201:1': ['engineering drawing geometrical constructions tangents tutorial'],
  'R23CP2201:3': ['orthographic projection engineering drawing first angle third angle full tutorial'],
  'R23CP6401:3': ['preventive maintenance of computer PC hardware tutorial'],
  'R23CP6401:5': ['BIOS settings configuration computer hardware tutorial Hindi'],
  'R23CI6602:2': ['computer software types operating system functions Windows files folders full course'],
  'R23CP6402:2': ['computer software types operating system functions Windows files folders full course'],
  'R23CI6602:3': ['MS Word full course for beginners Hindi word processing'],
  'R23CP6402:3': ['MS Word full course for beginners Hindi word processing'],
  'R23CI6602:4': ['Microsoft Excel full course for beginners Hindi formulas charts formatting'],
  'R23CP6402:4': ['Microsoft Excel full course for beginners Hindi formulas charts formatting'],
  'R23CI6602:5': ['Microsoft PowerPoint full course for beginners Hindi presentation slides'],
  'R23CP6402:5': ['Microsoft PowerPoint full course for beginners Hindi presentation slides'],
  'R23CI6602:6': ['MS DOS commands computer networks internet fundamentals Hindi'],
  'R23CP6402:6': ['MS DOS commands computer networks internet fundamentals Hindi'],
  'R23CI1301:1': ['basic electrical engineering magnetic circuits AC DC single phase three phase full course'],
  'R23CP1301:1': ['basic electrical engineering magnetic circuits AC DC single phase three phase full course'],
  'R23CI1301:4': ['PN junction Zener LED filters regulated power supply UPS tutorial'],
  'R23CP1301:4': ['PN junction Zener LED filters regulated power supply UPS tutorial'],
  'R23CI1301:6': ['sensors and transducers types active passive analog digital tutorial'],
  'R23CP1301:6': ['sensors and transducers types active passive analog digital tutorial'],
  'R23CI4601:1': ['life skills meaning importance self assessment students'],
  'R23CP4401:1': ['life skills meaning importance self assessment students'],
  'R23CI4601:3': ['environmental awareness causes effects solutions environmental problems'],
  'R23CP4401:3': ['environmental awareness causes effects solutions environmental problems'],
  'R23CI4601:4': ['emotional intelligence self awareness managing emotions students'],
  'R23CP4401:4': ['emotional intelligence self awareness managing emotions students'],
  'R23CI1602:6': ['video editing color correction audio editing tutorial for beginners'],
  'R23CP1402:6': ['video editing color correction audio editing tutorial for beginners'],
  'R23CI4602:6': ['electoral literacy voting process election commission India students'],
  'R23CP4402:6': ['electoral literacy voting process election commission India students'],
  'R23CI6405:4': ['marketing management fundamentals marketing mix 7Ps Hindi'],
  'R23CP6405:4': ['marketing management fundamentals marketing mix 7Ps Hindi'],
  'R23CP6405:6': ['brainstorming techniques idea generation session tutorial'],
  'R23CI1605:1': ['engineering seminar capstone project orientation topic selection'],
  'R23CP1407:1': ['engineering seminar capstone project orientation topic selection'],
  'R23CP1407:3': ['engineering seminar report documentation PPT presentation guidelines'],
  'R23CI1606:5': ['digital asset management IoT inventory ERP CRM tutorial'],
  'R23CP1405:4': ['Java servlet full tutorial lifecycle request response session Hindi'],
  'R23CP1406:1': ['PHP full course for beginners Hindi CodeWithHarry'],
  'R23CI2609:6': ['IIoT five layer architecture edge computing security service oriented architecture'],
  'R23CP3401:1': ['internet architecture IPv4 IPv6 subnetting ARP RARP network layer full tutorial'],
  'R23CP3402:1': ['database architecture query processing optimization concurrency control full tutorial'],
  'R23CP3406:2': ['R programming boolean logical operators if else loops functions tutorial'],
  'R23CP3406:3': ['R programming strings vectors matrix list array data frame factors tutorial'],
  'R23CP3406:6': ['R programming date time lubridate tutorial'],
}))

const TITLE_GUARDS = new Map(Object.entries({
  'R23CP2201:1': /engineering drawing|geometrical construction|geometric construction/i,
  'R23CP2201:3': /orthographic projection/i,
  'R23CP6401:3': /preventive maintenance|computer maintenance|pc maintenance/i,
  'R23CP6401:5': /\bbios\b/i,
  'R23CI6602:2': /software|operating system|windows/i,
  'R23CP6402:2': /software|operating system|windows/i,
  'R23CI6602:3': /word processing|microsoft word|ms word/i,
  'R23CP6402:3': /word processing|microsoft word|ms word/i,
  'R23CI6602:4': /excel|spreadsheet|google sheets/i,
  'R23CP6402:4': /excel|spreadsheet|google sheets/i,
  'R23CI6602:5': /powerpoint|presentation|slides/i,
  'R23CP6402:5': /powerpoint|presentation|slides/i,
  'R23CI6602:6': /dos|computer network|internet/i,
  'R23CP6402:6': /dos|computer network|internet/i,
  'R23CI1301:1': /basic electrical|magnetic circuit|ac (?:and|&) dc|three phase/i,
  'R23CP1301:1': /basic electrical|magnetic circuit|ac (?:and|&) dc|three phase/i,
  'R23CI1301:4': /diode|zener|regulated power supply|\bups\b/i,
  'R23CP1301:4': /diode|zener|regulated power supply|\bups\b/i,
  'R23CI1301:6': /sensor|transducer/i,
  'R23CP1301:6': /sensor|transducer/i,
  'R23CI4601:1': /life skills/i,
  'R23CP4401:1': /life skills/i,
  'R23CI4601:3': /environment/i,
  'R23CP4401:3': /environment/i,
  'R23CI4601:4': /emotional intelligence|managing emotions|self awareness/i,
  'R23CP4401:4': /emotional intelligence|managing emotions|self awareness/i,
  'R23CI1602:6': /video edit|colour correction|color correction|audio edit/i,
  'R23CP1402:6': /video edit|colour correction|color correction|audio edit/i,
  'R23CI4602:6': /electoral|voting|election commission/i,
  'R23CP4402:6': /electoral|voting|election commission/i,
  'R23CI6405:4': /marketing/i,
  'R23CP6405:4': /marketing/i,
  'R23CP6405:6': /brainstorm/i,
  'R23CI1605:1': /seminar|capstone/i,
  'R23CP1407:1': /seminar|capstone/i,
  'R23CP1407:3': /seminar|report|presentation/i,
  'R23CI1606:5': /asset management|inventory|\berp\b|\bcrm\b|iot asset/i,
  'R23CP1405:4': /servlet/i,
  'R23CP1406:1': /\bphp\b/i,
  'R23CI2609:6': /iiot|industrial iot|industrial internet/i,
  'R23CP3401:1': /internet architecture|network layer|ipv4|ipv6|subnet/i,
  'R23CP3402:1': /database architecture|query optimization|query processing/i,
  'R23CP3406:2': /\br programming\b|\bin r\b|\brstudio\b/i,
  'R23CP3406:3': /\br programming\b|\bin r\b|\brstudio\b/i,
  'R23CP3406:6': /\br programming\b|\bin r\b|\brstudio\b|lubridate/i,
}))

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'into', 'is', 'it', 'its', 'of', 'on', 'or',
  'the', 'to', 'using', 'with', 'unit', 'introduction', 'overview', 'basic', 'basics', 'concept', 'concepts', 'lecture',
  'lectures', 'tutorial', 'part', 'class', 'chapter', 'learn', 'course', 'video', 'diploma', 'purpose', 'type', 'types',
])

const KNOWN_POPULAR_CHANNELS = [
  /gate smashers/i, /neso academy/i, /knowledge gate/i, /jenny.?s lectures/i, /codewithharry/i, /apna college/i,
  /wscube tech/i, /last moment tuitions/i, /ekeeda/i, /gajendra purohit/i, /all about electronics/i,
  /khan academy/i, /freecodecamp/i, /programming with mosh/i, /ibm technology/i, /simplilearn/i,
  /kharat academy/i, /easy engineering classes/i, /5 minutes engineering/i, /education 4u/i,
  /bbc learning english/i, /english with lucy/i, /dear sir/i, /adda247/i, /geeksforgeeks/i,
  /tutorials point/i, /great learning/i, /edureka/i, /study iq/i, /magnet brains/i, /spoken tutorial/i,
]

const BAD_TITLE_PATTERNS = [
  /#shorts?\b/i, /status video/i, /motivation(?:al)? (?:speech|video)/i, /question paper/i, /answer key/i,
  /vacancy|recruitment|admission/i, /live now/i, /trailer/i,
]

await main()

async function main() {
  const allItems = queue.items ?? []
  const previous = (repairMode || curateOnly) && exists(outputPath) ? JSON.parse(readFileSync(outputPath, 'utf8')) : null
  const previousFailures = new Set((previous?.failures ?? []).map((failure) => keyFor(failure)))
  const items = curateOnly
    ? []
    : repairMode
    ? allItems.filter((item) => REPAIR_QUERIES.has(keyFor(item)) || previousFailures.has(keyFor(item)))
    : allItems
  const researched = await mapConcurrent(items, concurrency, researchLesson)
  const freshMappings = researched.flatMap((item) => item ? [item] : [])
  const freshById = new Map(freshMappings.map((mapping) => [mapping.researchQueueId, mapping]))
  const mappings = (repairMode || curateOnly)
    ? (previous?.mappings ?? []).map((mapping) => freshById.get(mapping.researchQueueId) ?? mapping)
        .concat(freshMappings.filter((mapping) => !(previous?.mappings ?? []).some((existing) => existing.researchQueueId === mapping.researchQueueId)))
    : freshMappings
  const failures = allItems.filter((item) => !mappings.some((mapping) => mapping.researchQueueId === item.id))
  await applyCurationOverrides(mappings)
  const output = {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: relative(root, inputPath).replaceAll('\\', '/'),
    policy: {
      publication: 'Every row is research-complete but remains pending academic review and hidden from students.',
      directVideosOnly: true,
      allowedLanguages: ['en', 'hi', 'hinglish'],
      selectionMethod: 'Two focused YouTube searches per official lesson, curriculum-overlap ranking, popular-channel weighting, and YouTube oEmbed verification.',
      reviewerStillRequired: [
        'Listen to confirm spoken English, Hindi, or Hinglish.',
        'Watch enough to confirm exact CWIT outcome coverage and diploma-level depth.',
        'Confirm embedding, captions, restrictions, and useful start/end timestamps in the reviewer session.',
        'Record the named reviewer and rationale before promotion.',
      ],
      curationOverrides: relative(root, overridesPath).replaceAll('\\', '/'),
    },
    summary: {
      requestedLessons: allItems.length,
      researchedLessons: mappings.length,
      unresolvedLessons: failures.length,
      primaryCandidates: mappings.length,
      alternateCandidates: mappings.reduce((sum, mapping) => sum + mapping.alternates.length, 0),
      oembedVerifiedPrimaryCandidates: mappings.filter((mapping) => mapping.oembedStatus === 'found').length,
    },
    failures: failures.map((item) => ({
      researchQueueId: item.id,
      programmeCode: item.programmeCode,
      semesterNumber: item.semesterNumber,
      subjectCode: item.subjectCode,
      lessonSlug: item.lessonSlug,
      lessonTitle: item.lessonTitle,
    })),
    mappings,
  }
  writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
  console.warn(`[video-research] wrote ${mappings.length}/${allItems.length} researched mappings to ${relative(root, outputPath)}`)
  if (failures.length) process.exitCode = 2
}

async function researchLesson(item, index) {
  const queries = researchQueries(item)
  const resultGroups = await Promise.all(queries.map((query) => searchYouTube(query)))
  const seen = new Set()
  const ranked = resultGroups.flat().filter((video) => {
    if (!video.videoId || seen.has(video.videoId)) return false
    seen.add(video.videoId)
    const guard = TITLE_GUARDS.get(keyFor(item))
    return !BAD_TITLE_PATTERNS.some((pattern) => pattern.test(video.title)) && (!guard || guard.test(video.title))
  }).map((video) => ({ ...video, ...scoreVideo(item, video) }))
    .filter((video) => video.curriculumOverlap > 0 && video.score >= 10)
    .sort((left, right) => right.score - left.score || right.viewCount - left.viewCount)

  const verified = []
  for (const candidate of ranked.slice(0, 10)) {
    const evidence = await verifyOembed(candidate.videoId)
    if (!evidence) continue
    verified.push({ ...candidate, ...evidence })
    if (verified.length === 3) break
  }
  const primary = verified[0]
  if (!primary) {
    console.warn(`[video-research] ${index + 1}/${queue.items.length} unresolved ${item.subjectCode} ${item.lessonSlug}`)
    return null
  }
  console.warn(`[video-research] ${index + 1}/${queue.items.length} ${item.subjectCode} ${item.lessonSlug} -> ${primary.videoId} (${primary.channel})`)
  return {
    researchQueueId: item.id,
    programmeCode: item.programmeCode,
    semesterNumber: item.semesterNumber,
    departmentCode: item.departmentCode,
    subjectCode: item.subjectCode,
    subjectName: item.subjectName,
    unitNumber: item.unitNumber,
    lessonSlug: item.lessonSlug,
    lessonTitle: item.lessonTitle,
    officialScope: item.officialScope,
    learningOutcomes: item.learningOutcomes,
    videoId: primary.videoId,
    canonicalUrl: `https://www.youtube.com/watch?v=${primary.videoId}`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${primary.videoId}`,
    title: primary.oembedTitle || primary.title,
    channel: primary.oembedAuthor || primary.channel,
    channelUrl: primary.oembedAuthorUrl || primary.channelUrl,
    durationSeconds: primary.durationSeconds,
    viewCount: primary.viewCount,
    publishedText: primary.publishedText,
    description: primary.description,
    language: languageEstimate(primary),
    languageVerificationStatus: 'pending_manual_listening_confirmation',
    role: 'primary_video',
    playlistId: null,
    playlistIndex: null,
    confidence: Math.min(0.98, Number((0.55 + primary.score / 200).toFixed(3))),
    curriculumOverlap: primary.curriculumOverlap,
    matchedTerms: primary.matchedTerms,
    selectionRationale: rationale(item, primary),
    searchQueries: queries,
    oembedStatus: 'found',
    oembedVerifiedAt: new Date().toISOString(),
    embeddabilityStatus: 'pending_player_verification',
    reviewStatus: 'pending_review',
    sourcePdf: item.sourceUrl,
    sourcePage: item.sourcePages?.[0] ?? 0,
    reviewerChecklist: item.reviewerChecklist,
    alternates: verified.slice(1).map((candidate) => ({
      videoId: candidate.videoId,
      canonicalUrl: `https://www.youtube.com/watch?v=${candidate.videoId}`,
      title: candidate.oembedTitle || candidate.title,
      channel: candidate.oembedAuthor || candidate.channel,
      durationSeconds: candidate.durationSeconds,
      viewCount: candidate.viewCount,
      score: candidate.score,
      matchedTerms: candidate.matchedTerms,
      oembedStatus: 'found',
    })),
  }
}

async function applyCurationOverrides(mappings) {
  for (const override of curation.overrides ?? []) {
    const targets = mappings.filter((mapping) =>
      override.subjectCodes?.includes(mapping.subjectCode) && mapping.unitNumber === override.unitNumber,
    )
    if (targets.length === 0) throw new Error(`Curation override has no lesson target: ${override.subjectCodes?.join(',')} Unit ${override.unitNumber}`)
    const evidence = await verifyOembed(override.videoId)
    if (!evidence) throw new Error(`Curation override failed YouTube oEmbed verification: ${override.videoId}`)
    const video = null
    for (const mapping of targets) {
      mapping.alternates = [
        {
          videoId: mapping.videoId,
          canonicalUrl: mapping.canonicalUrl,
          title: mapping.title,
          channel: mapping.channel,
          durationSeconds: mapping.durationSeconds,
          viewCount: mapping.viewCount,
          score: mapping.confidence,
          matchedTerms: mapping.matchedTerms,
          oembedStatus: mapping.oembedStatus,
        },
        ...mapping.alternates.filter((alternate) => alternate.videoId !== override.videoId && alternate.videoId !== mapping.videoId),
      ].slice(0, 3)
      mapping.videoId = override.videoId
      mapping.canonicalUrl = `https://www.youtube.com/watch?v=${override.videoId}`
      mapping.embedUrl = `https://www.youtube-nocookie.com/embed/${override.videoId}`
      mapping.title = evidence.oembedTitle || video?.title || mapping.title
      mapping.channel = evidence.oembedAuthor || video?.channel || mapping.channel
      mapping.channelUrl = evidence.oembedAuthorUrl || video?.channelUrl || mapping.channelUrl
      mapping.durationSeconds = video?.durationSeconds ?? null
      mapping.viewCount = video?.viewCount ?? 0
      mapping.publishedText = video?.publishedText ?? null
      mapping.description = video?.description ?? mapping.title
      mapping.language = languageEstimate({ title: mapping.title, description: mapping.description })
      mapping.confidence = 0.98
      mapping.selectionRationale = `${override.reason} YouTube oEmbed identity/availability was verified; spoken language, exact depth, captions, restrictions, timestamps, and in-player embedding still require named academic review.`
      mapping.curationStatus = 'human_selected_pending_academic_review'
    }
  }
}

function researchQueries(item) {
  const phrases = scopePhrases(item)
  const primaryTopic = phrases.slice(0, 2).join(' ')
  const preferred = item.preferredChannels?.slice(0, 2).join(' ') ?? ''
  return [
    ...(REPAIR_QUERIES.get(keyFor(item)) ?? []),
    `${item.subjectName} ${item.lessonTitle} ${primaryTopic} tutorial`,
    `${item.lessonTitle} ${primaryTopic} ${preferred} Hindi English`,
  ].map((query) => query.replace(/\s+/g, ' ').trim().slice(0, 280)).slice(0, 3)
}

function scopePhrases(item) {
  const lessonNormalized = normalize(item.lessonTitle)
  return String(item.officialScope ?? '')
    .replace(/\bunit\s*[-–—]?\s*(?:[ivx]+|\d+)\b/gi, ' ')
    .split(/\n+|;|(?=\b\d+(?:\.\d+)+\s*)/)
    .map((value) => value.replace(/^\s*\d+(?:\.\d+)*\s*/, '').replace(/\s+/g, ' ').trim())
    .filter((value) => value.length >= 5 && normalize(value) !== lessonNormalized)
    .sort((left, right) => informationScore(right) - informationScore(left))
    .slice(0, 4)
}

function informationScore(value) {
  return [...tokens(value)].length * 3 + Math.min(40, value.length) / 10
}

async function searchYouTube(query) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; LernioCurriculumResearch/2.0)' },
        signal: AbortSignal.timeout(25_000),
      })
      if (!response.ok) throw new Error(`YouTube search ${response.status}`)
      return videosFromYoutubeHtml(await response.text()).slice(0, 18)
    } catch (error) {
      if (attempt === 2) {
        console.warn(`[video-research] search failed: ${query}: ${error instanceof Error ? error.message : error}`)
        return []
      }
      await new Promise((resolve) => setTimeout(resolve, 750 * (attempt + 1)))
    }
  }
  return []
}

function videosFromYoutubeHtml(html) {
  const marker = 'var ytInitialData = '
  const start = html.indexOf(marker)
  if (start < 0) return []
  const jsonStart = start + marker.length
  const jsonEnd = html.indexOf(';</script>', jsonStart)
  if (jsonEnd < 0) return []
  const initialData = JSON.parse(html.slice(jsonStart, jsonEnd))
  const renderers = []
  collectVideoRenderers(initialData, renderers)
  return renderers.flatMap((renderer) => {
    const videoId = renderer.videoId
    const title = textValue(renderer.title)
    if (typeof videoId !== 'string' || !title) return []
    const channel = textValue(renderer.longBylineText) || textValue(renderer.ownerText) || 'YouTube'
    const durationSeconds = parseDuration(textValue(renderer.lengthText))
    const viewCount = parseViewCount(textValue(renderer.viewCountText) || textValue(renderer.shortViewCountText))
    const description = textValue(renderer.detailedMetadataSnippets?.[0]?.snippetText) || title
    const channelUrl = renderer.longBylineText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl
    return [{ videoId, title, channel, channelUrl: channelUrl ? `https://www.youtube.com${channelUrl}` : null, durationSeconds, viewCount, publishedText: textValue(renderer.publishedTimeText), description }]
  })
}

function collectVideoRenderers(value, output) {
  if (Array.isArray(value)) {
    for (const item of value) collectVideoRenderers(item, output)
    return
  }
  if (!value || typeof value !== 'object') return
  if (value.videoRenderer && typeof value.videoRenderer === 'object') output.push(value.videoRenderer)
  for (const nested of Object.values(value)) collectVideoRenderers(nested, output)
}

function textValue(value) {
  if (!value || typeof value !== 'object') return null
  if (typeof value.simpleText === 'string') return value.simpleText
  if (Array.isArray(value.runs)) return value.runs.map((run) => run?.text ?? '').join('').trim() || null
  return null
}

async function verifyOembed(videoId) {
  try {
    const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`, {
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; LernioCurriculumResearch/2.0)' },
      signal: AbortSignal.timeout(12_000),
    })
    if (!response.ok) return null
    const payload = await response.json()
    if (payload.type !== 'video' || payload.provider_name !== 'YouTube') return null
    return { oembedTitle: payload.title ?? null, oembedAuthor: payload.author_name ?? null, oembedAuthorUrl: payload.author_url ?? null }
  } catch {
    return null
  }
}

function scoreVideo(item, video) {
  const titleTokens = tokens(video.title)
  const lessonTokens = tokens(`${item.lessonTitle} ${item.officialScope} ${(item.learningOutcomes ?? []).join(' ')}`)
  const exactTitleTokens = tokens(item.lessonTitle)
  const matchedTerms = [...lessonTokens].filter((token) => titleTokens.has(token))
  const titleMatches = [...exactTitleTokens].filter((token) => titleTokens.has(token))
  const preferredChannel = (item.preferredChannels ?? []).some((channel) => normalize(video.channel).includes(normalize(channel)))
  const popularChannel = KNOWN_POPULAR_CHANNELS.some((pattern) => pattern.test(video.channel))
  const curriculumOverlap = matchedTerms.reduce((sum, token) => sum + (token.length >= 7 ? 2 : 1), 0)
  const durationScore = video.durationSeconds == null ? 0 : video.durationSeconds >= 240 && video.durationSeconds <= 7200 ? 9 : video.durationSeconds >= 120 ? 3 : -10
  const popularityScore = video.viewCount > 0 ? Math.min(14, Math.log10(video.viewCount + 1) * 2.25) : 0
  const score = curriculumOverlap * 6 + titleMatches.length * 8 + (preferredChannel ? 24 : popularChannel ? 12 : 0) + durationScore + popularityScore
  return { score: Number(score.toFixed(2)), curriculumOverlap, matchedTerms, preferredChannel, popularChannel }
}

function rationale(item, candidate) {
  const channelReason = candidate.preferredChannel ? 'a preferred popular channel' : candidate.popularChannel ? 'a recognized educational channel' : 'the strongest curriculum-title match'
  return `Selected for ${item.subjectCode} Unit ${item.unitNumber} because the title matches ${candidate.matchedTerms.slice(0, 8).join(', ') || 'the official unit topic'}, comes from ${channelReason}, and passed YouTube oEmbed identity/availability lookup. Spoken language, exact depth, captions, restrictions, timestamps, and in-player embedding still require named academic review.`
}

function languageEstimate(candidate) {
  const value = `${candidate.title} ${candidate.description}`.toLowerCase()
  if (/\b(hindi|hinglish|हिंदी|हिन्दी)\b/.test(value)) return 'hi'
  return 'en'
}

function tokens(value) {
  return new Set(normalize(value).split(' ').filter((token) => token.length > 1 && !STOP_WORDS.has(token)))
}

function normalize(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9+#]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function parseDuration(value) {
  if (!value) return null
  const parts = value.split(':').map((part) => Number.parseInt(part, 10))
  if (parts.some((part) => !Number.isFinite(part))) return null
  return parts.reduce((total, part) => total * 60 + part, 0)
}

function parseViewCount(value) {
  if (!value) return 0
  const match = value.replaceAll(',', '').match(/([\d.]+)\s*([KMB])?/i)
  if (!match) return 0
  const multiplier = { K: 1e3, M: 1e6, B: 1e9 }[match[2]?.toUpperCase()] ?? 1
  return Math.round(Number.parseFloat(match[1]) * multiplier)
}

async function mapConcurrent(items, limit, worker) {
  const results = new Array(items.length)
  let cursor = 0
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      results[index] = await worker(items[index], index)
    }
  }))
  return results
}

function exists(path) {
  try {
    readFileSync(path)
    return true
  } catch {
    return false
  }
}

function keyFor(item) {
  return `${String(item.subjectCode ?? '').toUpperCase()}:${item.unitNumber ?? item.officialUnitNumber ?? ''}`
}

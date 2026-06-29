export interface OfficialCourseOutcomeCandidate {
  code: string
  text: string
}

export interface OfficialUnitCandidate {
  order: number
  rawLabel: string
  title: string
  source: 'summary_table' | 'course_content'
}

export interface OfficialCourseStructureCandidate {
  courseCode: string
  sourcePages: number[]
  candidateOutcomes: OfficialCourseOutcomeCandidate[]
  candidateUnits: OfficialUnitCandidate[]
  unitQuality: UnitCandidateQuality
  extractionStatus: 'course_block_not_found' | 'needs_review' | 'structure_promotable'
}

export interface OfficialCourseCatalogEntry {
  departmentCode: string
  courseCode: string
  courseName: string
  sourcePages: number[]
}

export interface UnitCandidateQuality {
  promotable: boolean
  blockers: string[]
}

export function extractOfficialCourseStructure(
  curriculumText: string,
  courseCode: string,
): OfficialCourseStructureCandidate {
  const courseBlock = findCourseBlock(curriculumText, courseCode)
  if (!courseBlock) {
    return {
      courseCode,
      sourcePages: [],
      candidateOutcomes: [],
      candidateUnits: [],
      unitQuality: assessUnitCandidateQuality([]),
      extractionStatus: 'course_block_not_found',
    }
  }

  const candidateOutcomes = extractCourseOutcomes(courseBlock.text)
  const candidateUnits = extractUnitTitles(courseBlock.text)
  const unitQuality = assessUnitCandidateQuality(candidateUnits)
  return {
    courseCode,
    sourcePages: courseBlock.pages,
    candidateOutcomes,
    candidateUnits,
    unitQuality,
    extractionStatus: candidateOutcomes.length > 0 || unitQuality.promotable
      ? 'structure_promotable'
      : 'needs_review',
  }
}

export function extractOfficialCourseCatalog(
  curriculumText: string,
  departmentCode: string,
): OfficialCourseCatalogEntry[] {
  const entries: OfficialCourseCatalogEntry[] = []
  const coursePattern = /Course\s+Name\s+([^\n]+?)\r?\n\s*Course\s+(?:code|Code)\s+(R23[A-Z]{2}\d{4})/gi

  for (const match of curriculumText.matchAll(coursePattern)) {
    const courseName = normalizeWhitespace(match[1] ?? '')
    const courseCode = normalizeWhitespace(match[2] ?? '')
    if (!courseName || !courseCode) continue

    entries.push({
      departmentCode,
      courseCode,
      courseName,
      sourcePages: pageNumbersNearIndex(curriculumText, match.index ?? 0),
    })
  }

  return dedupeCatalogEntries(entries)
}

export function hasPromotableUnits(units: OfficialUnitCandidate[]) {
  return assessUnitCandidateQuality(units).promotable
}

export function assessUnitCandidateQuality(units: OfficialUnitCandidate[]): UnitCandidateQuality {
  const blockers: string[] = []
  const sortedUnits = [...units].sort((a, b) => a.order - b.order)
  const orders = sortedUnits.map((unit) => unit.order)
  const titles = sortedUnits.map((unit) => unit.title)

  if (units.length < 5) blockers.push('Fewer than five unit titles were extracted.')
  if (new Set(orders).size !== orders.length) blockers.push('Duplicate unit order numbers were extracted.')
  if (orders[0] !== 1) blockers.push('Unit order does not start at 1.')
  if (!orders.every((order, index) => order === index + 1)) {
    blockers.push('Unit order is not consecutive from 1.')
  }
  if (new Set(titles.map((title) => title.toLowerCase())).size !== titles.length) {
    blockers.push('Duplicate unit titles were extracted.')
  }

  sortedUnits.forEach((unit) => {
    if (!isCleanUnitTitle(unit.title)) {
      blockers.push(`Unit ${unit.order} has an unclean title: ${unit.title}`)
    }
  })

  return { promotable: blockers.length === 0, blockers }
}

export function isCleanUnitTitle(title: string) {
  if (title.length < 3 || title.length > 100) return false
  if (/^\d+\b/.test(title)) return false
  if (/[^\x00-\x7F]/.test(title)) return false
  if (/\d+\./.test(title)) return false
  if (/,/.test(title)) return false
  if (/^(?:System|Professional|Intelligence|Lifecycle|Analytics)$/i.test(title)) return false
  if (/\bInternal\b/i.test(title)) return false
  if (/\b(?:and|or|of|in|to|for|with|&)\s*$/i.test(title)) return false
  if (/\b(?:Emerging|Professional|Operating|Environmental)\s*$/i.test(title)) return false
  if (/\b(?:CO|LO|LLO|TLO|UO)\s*\d/i.test(title)) return false
  if (/\b(?:TLO|mentioned against|projection|circumscribe|sectional|state the difference)\b/i.test(title)) return false
  if (/\b(?:Describe|Explain|Identify|Write|Execute|Apply|Use)\s+(?:the|given|different)\b/i.test(title)) return false
  if (/\b(?:Unit Outcomes?|Topics and Sub-?topics|Teaching Distribution|Assessment)\b/i.test(title)) return false
  return /[A-Za-z]/.test(title)
}

function findCourseBlock(text: string, code: string): { text: string; pages: number[] } | null {
  const codePattern = new RegExp(`Course\\s+code\\s+${escapeRegExp(code)}|Course\\s+Code\\s+${escapeRegExp(code)}`, 'i')
  const match = codePattern.exec(text)
  if (!match) return null
  const start = text.lastIndexOf('--- page ', match.index)
  const nextCourse = text.slice(match.index + match[0].length).search(/\nCourse Name\s+/i)
  let end = nextCourse >= 0 ? match.index + match[0].length + nextCourse : text.length
  if (nextCourse >= 0) {
    const between = text.slice(match.index + match[0].length, end)
    const nextPageMarker = between.lastIndexOf('--- page ')
    if (nextPageMarker >= 0) {
      end = match.index + match[0].length + nextPageMarker
    }
  }
  const block = text.slice(start >= 0 ? start : match.index, end)
  return { text: block, pages: pageNumbersForBlock(block) }
}

function extractCourseOutcomes(text: string) {
  const section = sliceBetween(text, /COURSE\s+OUTCOMES?(?:\s*\(COs?\))?/i, /(?:COURSE\s+CONTENT|COURSE\s+CONTENTS|D\)\s*COURSE\s+CONTENT)/i)
  if (!section) return []

  const outcomes: OfficialCourseOutcomeCandidate[] = []
  const normalizedSection = normalizeCourseText(section)
  const outcomePattern = /\bCO\s*([1-9]\d*)\s*(?:[-:])?\s*([\s\S]*?)(?=\bCO\s*[1-9]\d*\s*(?:[-:])?|$)/gi
  for (const match of normalizedSection.matchAll(outcomePattern)) {
    const textValue = cleanOutcomeText(match[2] ?? '')
    if (textValue) {
      outcomes.push({
        code: `CO${match[1]}`,
        text: textValue,
      })
    }
  }

  if (outcomes.length === 0) {
    outcomes.push(...extractNumberedOutcomes(normalizedSection))
  }

  return dedupeByText(outcomes).slice(0, 12)
}

function extractNumberedOutcomes(section: string) {
  const outcomes: OfficialCourseOutcomeCandidate[] = []
  let current: { number: number; text: string } | null = null

  for (const rawLine of section.split(/\r?\n/)) {
    const line = normalizeWhitespace(rawLine)
    if (!line || /^(?:Students will|The students will|Course outcomes?|Outcomes?\b)/i.test(line)) continue

    const numbered = /^([1-9]\d*)[\].)]?\s+(.{8,})$/.exec(line)
    if (numbered) {
      if (current) outcomes.push({ code: `CO${current.number}`, text: cleanOutcomeText(current.text) })
      current = { number: Number(numbered[1]), text: numbered[2] ?? '' }
    } else if (current && !/^[A-Z]\)/.test(line)) {
      current.text = `${current.text} ${line}`
    }
  }

  if (current) outcomes.push({ code: `CO${current.number}`, text: cleanOutcomeText(current.text) })
  return outcomes.filter((outcome) => outcome.text.length > 0)
}

function extractUnitTitles(text: string) {
  const summaryUnits = extractSummaryUnitTitles(text)
  const contentUnits = extractContentUnitTitles(text)
  return dedupeUnits([...summaryUnits, ...contentUnits]).slice(0, 12)
}

function extractSummaryUnitTitles(text: string): OfficialUnitCandidate[] {
  const units: OfficialUnitCandidate[] = []
  const lines = text.split(/\r?\n/).map(normalizeWhitespace)
  const rowPattern = /^(?:\d+\s+)?(VI|IV|III|II|I|V)\s+(?:CO\s*\d+\s+)?(.+?)(?=\s+(?:CO\s*\d+|CO\d+|\d+\s+\d+|\d+\s+[RUA]\b|R-|U-|A-))/i

  for (const line of lines) {
    const match = rowPattern.exec(line)
    if (!match) continue
    const order = romanOrNumber(match[1] ?? '')
    const title = cleanUnitTitle(match[2] ?? '')
    if (order && title && isCleanUnitTitle(title)) {
      units.push({
        order,
        rawLabel: match[1] ?? '',
        title,
        source: 'summary_table',
      })
    }
  }

  return units
}

function extractContentUnitTitles(text: string): OfficialUnitCandidate[] {
  const units: OfficialUnitCandidate[] = []
  const unitPattern = /\b(?:Unit|UNIT)\s*(?:NO\.)?\s*(?:-|:|–|—|â€“|â€”)?\s*(VI|IV|III|II|I|V|[1-6])\s*(?:[:\-.]|-|–|—|â€“|â€”)?\s*([^\n]{3,140})/g
  for (const match of text.matchAll(unitPattern)) {
    const rawLabel = match[1] ?? ''
    const order = romanOrNumber(rawLabel)
    const title = cleanUnitTitle(match[2] ?? '')
    if (order && title && isCleanUnitTitle(title)) {
      units.push({ order, rawLabel, title, source: 'course_content' })
    }
  }
  return units
}

function cleanOutcomeText(raw: string): string {
  return normalizeWhitespace(raw)
    .replace(/^(?:Students will be able to achieve|Students will be able to|[-:]\s*)/i, '')
    .replace(/\s+--- page \d+ ---.*$/i, '')
    .replace(/\s+(?:D\)|COURSE\s+CONTENT).*$/i, '')
    .replace(/([.])\s+\d+\s*$/, '$1')
    .replace(/[.;:,]\s*$/, '.')
    .trim()
}

function cleanUnitTitle(raw: string): string {
  return normalizeWhitespace(raw)
    .replace(/\s+(?:LLO|LO|TLO|UO)\s*\d+(?:\.\d+)?.*$/i, '')
    .replace(/\s+\d+[a-z]\..*$/i, '')
    .replace(/\s*\d+\.\d+\s+.*$/i, '')
    .replace(/\s+\d+\s+\d+\s+CO\d+.*$/i, '')
    .replace(/\s+CO\s*\d+.*$/i, '')
    .replace(/\s+(?:CL|FA|TH)\b.*$/i, '')
    .replace(/^[\s:.-]+|[\s:.-]+$/g, '')
    .trim()
}

function sliceBetween(text: string, startPattern: RegExp, endPattern: RegExp) {
  const startMatch = startPattern.exec(text)
  if (!startMatch) return ''
  const afterStart = text.slice(startMatch.index + startMatch[0].length)
  const endMatch = endPattern.exec(afterStart)
  return endMatch ? afterStart.slice(0, endMatch.index) : afterStart
}

function pageNumbersForBlock(text: string): number[] {
  return Array.from(text.matchAll(/--- page (\d+) ---/g), (match) => Number(match[1]))
}

function pageNumbersNearIndex(text: string, index: number): number[] {
  const before = text.slice(0, index)
  const matches = Array.from(before.matchAll(/--- page (\d+) ---/g))
  const lastPage = matches.at(-1)
  return lastPage ? [Number(lastPage[1])] : []
}

function dedupeCatalogEntries(entries: OfficialCourseCatalogEntry[]) {
  const byCode = new Map<string, OfficialCourseCatalogEntry>()
  for (const entry of entries) {
    if (!byCode.has(entry.courseCode)) {
      byCode.set(entry.courseCode, entry)
    }
  }
  return Array.from(byCode.values()).sort((a, b) => a.courseCode.localeCompare(b.courseCode))
}

function dedupeByText<T extends { text: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = item.text.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function dedupeUnits(units: OfficialUnitCandidate[]) {
  const byOrder = new Map<number, OfficialUnitCandidate>()
  for (const unit of units) {
    const existing = byOrder.get(unit.order)
    if (!existing || existing.source !== 'summary_table') {
      byOrder.set(unit.order, unit)
    }
  }
  return Array.from(byOrder.values()).sort((a, b) => a.order - b.order)
}

function romanOrNumber(value: string): number | null {
  if (/^\d+$/.test(value)) return Number(value)
  const lookup: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 }
  return lookup[value.toUpperCase()] ?? null
}

function normalizeCourseText(value: string): string {
  return value
    .replace(/[–—]/g, '-')
    .replace(/â€“|â€”/g, '-')
}

function normalizeWhitespace(value: string): string {
  return normalizeCourseText(value).replace(/\s+/g, ' ').trim()
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

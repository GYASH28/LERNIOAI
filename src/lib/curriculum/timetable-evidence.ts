export interface TimetableEvidenceSource {
  sourceId: string
  title: string
  sourceUrl: string
  localPdfPath: string
  extractedTextPath: string
  columnTextPath?: string
}

export interface TimetableColumnText {
  label: string
  departmentCode: 'COMP' | 'CIOT'
  programmeCode: 'DCOMP' | 'DCIOT'
  session: 'morning' | 'afternoon'
  page: number
  bbox: number[]
  text: string
}

export interface TimetableCodeAppearance {
  code: string
  departmentCode: 'COMP' | 'CIOT'
  programmeCode: 'DCOMP' | 'DCIOT'
  page: number | null
  lineNumber: number
  lineText: string
  nearbyLines: string[]
  columnLabel: string | null
  session: 'morning' | 'afternoon' | null
  matchType: 'exact_text_code' | 'column_crop_exact_text_code'
  evidenceStatus: 'timetable_evidence_only'
}

export interface TimetableCodeEvidence {
  code: string
  departmentCode: 'COMP' | 'CIOT'
  programmeCode: 'DCOMP' | 'DCIOT'
  appearances: TimetableCodeAppearance[]
  firstPage: number | null
  semesterPlacementStatus: 'not_semester_placement_verified'
  publicationStatus: 'blocked_until_official_semester_manifest'
}

export interface TimetableEvidenceReport {
  generatedAt: string
  status: 'review_only'
  source: TimetableEvidenceSource
  extraction: {
    pageCount: number
    textCharacters: number
    limitation: string
  }
  totals: {
    appearances: number
    wholePageTextAppearances: number
    columnCropAppearances: number
    uniqueCodes: number
    compCodes: number
    ciotCodes: number
    publicationReadySemesterManifests: 0
  }
  codes: TimetableCodeEvidence[]
}

const COURSE_CODE_PATTERN = /\bR23(?:CP|CI)\d{4}\b/g

export function buildTimetableEvidenceReport(input: {
  text: string
  columnTexts?: TimetableColumnText[]
  source: TimetableEvidenceSource
  generatedAt: string
}): TimetableEvidenceReport {
  const wholePageAppearances = extractTimetableCodeAppearances(input.text)
  const columnAppearances = extractTimetableColumnCodeAppearances(input.columnTexts ?? [])
  const appearances = [...wholePageAppearances, ...columnAppearances]
  const codes = groupAppearancesByCode(appearances)

  return {
    generatedAt: input.generatedAt,
    status: 'review_only',
    source: input.source,
    extraction: {
      pageCount: countPages(input.text),
      textCharacters: input.text.length,
      limitation: 'The official timetable is a dense PDF table. This report records exact whole-page and fixed-column text-extracted R23 CP/CI code appearances only; it does not infer semester placement from table position or course-code numbering.',
    },
    totals: {
      appearances: appearances.length,
      wholePageTextAppearances: wholePageAppearances.length,
      columnCropAppearances: columnAppearances.length,
      uniqueCodes: codes.length,
      compCodes: codes.filter((code) => code.departmentCode === 'COMP').length,
      ciotCodes: codes.filter((code) => code.departmentCode === 'CIOT').length,
      publicationReadySemesterManifests: 0,
    },
    codes,
  }
}

export function extractTimetableCodeAppearances(text: string): TimetableCodeAppearance[] {
  const lines = text.split(/\r?\n/)
  const appearances: TimetableCodeAppearance[] = []
  let page: number | null = null

  lines.forEach((rawLine, index) => {
    const lineNumber = index + 1
    const pageMatch = /^--- page (\d+) ---$/.exec(rawLine.trim())
    if (pageMatch) {
      page = Number(pageMatch[1])
      return
    }

    const lineText = normalizeLine(rawLine)
    if (!lineText) return

    for (const match of lineText.matchAll(COURSE_CODE_PATTERN)) {
      const code = match[0]
      appearances.push({
        code,
        ...programmeForCode(code),
        page,
        lineNumber,
        lineText,
        nearbyLines: nearbyNonEmptyLines(lines, index),
        columnLabel: null,
        session: null,
        matchType: 'exact_text_code',
        evidenceStatus: 'timetable_evidence_only',
      })
    }
  })

  return appearances
}

export function extractTimetableColumnCodeAppearances(
  columns: TimetableColumnText[],
): TimetableCodeAppearance[] {
  return columns.flatMap((column) => {
    const lines = column.text.split(/\r?\n/)
    const appearances: TimetableCodeAppearance[] = []

    lines.forEach((rawLine, index) => {
      const lineText = normalizeLine(rawLine)
      if (!lineText) return

      for (const match of lineText.matchAll(COURSE_CODE_PATTERN)) {
        const code = match[0]
        appearances.push({
          code,
          ...programmeForCode(code),
          page: column.page,
          lineNumber: index + 1,
          lineText,
          nearbyLines: nearbyNonEmptyLines(lines, index),
          columnLabel: column.label,
          session: column.session,
          matchType: 'column_crop_exact_text_code',
          evidenceStatus: 'timetable_evidence_only',
        })
      }
    })

    return appearances
  })
}

function groupAppearancesByCode(appearances: TimetableCodeAppearance[]): TimetableCodeEvidence[] {
  const grouped = new Map<string, TimetableCodeAppearance[]>()
  appearances.forEach((appearance) => {
    grouped.set(appearance.code, [...(grouped.get(appearance.code) ?? []), appearance])
  })

  return Array.from(grouped.entries())
    .map(([code, codeAppearances]) => ({
      code,
      departmentCode: codeAppearances[0].departmentCode,
      programmeCode: codeAppearances[0].programmeCode,
      appearances: codeAppearances,
      firstPage: firstPage(codeAppearances),
      semesterPlacementStatus: 'not_semester_placement_verified' as const,
      publicationStatus: 'blocked_until_official_semester_manifest' as const,
    }))
    .sort((a, b) => a.code.localeCompare(b.code))
}

function nearbyNonEmptyLines(lines: string[], index: number): string[] {
  return lines
    .slice(Math.max(0, index - 1), Math.min(lines.length, index + 2))
    .map(normalizeLine)
    .filter(Boolean)
}

function programmeForCode(code: string): Pick<TimetableCodeAppearance, 'departmentCode' | 'programmeCode'> {
  if (code.startsWith('R23CP')) return { departmentCode: 'COMP', programmeCode: 'DCOMP' }
  return { departmentCode: 'CIOT', programmeCode: 'DCIOT' }
}

function firstPage(appearances: TimetableCodeAppearance[]): number | null {
  const pages = appearances
    .map((appearance) => appearance.page)
    .filter((value): value is number => typeof value === 'number')
  return pages.length > 0 ? Math.min(...pages) : null
}

function countPages(text: string): number {
  return Array.from(text.matchAll(/^--- page \d+ ---$/gm)).length
}

function normalizeLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

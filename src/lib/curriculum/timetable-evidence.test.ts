import { describe, expect, it } from 'vitest'
import { buildTimetableEvidenceReport, extractTimetableCodeAppearances } from './timetable-evidence'

describe('official timetable evidence', () => {
  it('extracts exact CP and CI R23 code appearances with page and context', () => {
    const text = `--- page 1 ---
FINAL MPECS (R23) EXAMINATION WINTER 2025 TIME TABLE
SATURDAY EM EM EEMA PIC PIC ELE.ENG.
15/11/2025 (R23CE2801) (R23ME2801) (R23EE2302) (R23CP1401) (R23CI1601) (R23EX6301)
(R23EE2304) (R23CI6604)
--- page 2 ---
09/12/2025 PYTHON PROGRAMMING PYTHON PROGRAMMING
(R23CP1403) (R23CI1603) (R23EX2509)`

    const appearances = extractTimetableCodeAppearances(text)

    expect(appearances.map((appearance) => appearance.code)).toEqual([
      'R23CP1401',
      'R23CI1601',
      'R23CI6604',
      'R23CP1403',
      'R23CI1603',
    ])
    expect(appearances[1]).toMatchObject({
      code: 'R23CI1601',
      departmentCode: 'CIOT',
      programmeCode: 'DCIOT',
      page: 1,
      lineNumber: 4,
      evidenceStatus: 'timetable_evidence_only',
    })
    expect(appearances[1].nearbyLines).toContain(
      '15/11/2025 (R23CE2801) (R23ME2801) (R23EE2302) (R23CP1401) (R23CI1601) (R23EX6301)',
    )
  })

  it('keeps timetable appearances blocked for semester publication', () => {
    const report = buildTimetableEvidenceReport({
      generatedAt: '2026-06-29T00:00:00.000Z',
      text: `--- page 1 ---
(R23CP6404) (R23CI2603)`,
      columnTexts: [
        {
          label: 'morning_dcp_iot',
          departmentCode: 'CIOT',
          programmeCode: 'DCIOT',
          session: 'morning',
          page: 1,
          bbox: [229, 90, 269, 705],
          text: 'DATA STRUCTURES\n(R23CI2602)',
        },
      ],
      source: {
        sourceId: 'cwit-r23-winter-2025-timetable',
        title: 'CWIT Winter Examination 2025 Time Table',
        sourceUrl: 'https://cwit.mespune.org/wp-content/uploads/2025/10/Winter-Examination-2025.pdf',
        localPdfPath: 'content-import/official/Winter-Examination-2025.pdf',
        extractedTextPath: 'tmp/pdfs/official/Winter-Examination-2025.txt',
        columnTextPath: 'tmp/pdfs/official/Winter-Examination-2025.columns.json',
      },
    })

    expect(report.status).toBe('review_only')
    expect(report.totals).toMatchObject({
      appearances: 3,
      wholePageTextAppearances: 2,
      columnCropAppearances: 1,
      uniqueCodes: 3,
      compCodes: 1,
      ciotCodes: 2,
      publicationReadySemesterManifests: 0,
    })
    const ciotEvidence = report.codes.find((code) => code.code === 'R23CI2603')
    expect(ciotEvidence).toMatchObject({
      code: 'R23CI2603',
      semesterPlacementStatus: 'not_semester_placement_verified',
      publicationStatus: 'blocked_until_official_semester_manifest',
    })
  })
})

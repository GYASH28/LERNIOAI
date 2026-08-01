import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

interface OfficialCourseContent {
  coverage: {
    subjects: number
    units: number
    unitsWithExtractedContent: number
    unitsNeedingReview: number
  }
  subjects: Array<{
    programmeCode: string
    semesterNumber: number
    sourceUrl: string
    units: Array<{
      curriculumContent: string
      extractionStatus: string
    }>
  }>
}

function loadOfficialContent() {
  return JSON.parse(readFileSync(join(
    process.cwd(),
    'content',
    'curriculum',
    'cwit-r23',
    'official-course-content.json',
  ), 'utf8')) as OfficialCourseContent
}

describe('official CWIT course-content coverage', () => {
  it('covers every canonical subject and unit in both six-semester programmes', () => {
    const payload = loadOfficialContent()
    const partitions = new Set(payload.subjects.map(
      (subject) => `${subject.programmeCode}:${subject.semesterNumber}`,
    ))

    expect(payload.coverage).toEqual({
      subjects: 86,
      units: 403,
      unitsWithExtractedContent: 403,
      unitsNeedingReview: 0,
    })
    expect(partitions.size).toBe(12)
  })

  it('keeps every fallback unit tied to an official CWIT PDF and extracted scope', () => {
    const payload = loadOfficialContent()

    for (const subject of payload.subjects) {
      expect(subject.sourceUrl).toMatch(/^https:\/\/cwit\.mespune\.org\//)
      for (const unit of subject.units) {
        expect(unit.extractionStatus).toBe('content_extracted')
        expect(unit.curriculumContent.trim().length).toBeGreaterThan(0)
        expect(unit.curriculumContent).not.toMatch(/Tutorial Titles|\bISBN\b|\bPublisher\b/)
      }
    }
  })
})

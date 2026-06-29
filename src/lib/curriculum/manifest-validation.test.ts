import { describe, expect, it } from 'vitest'
import { validateCurriculumManifest } from './manifest-validation'

const validManifest = {
  manifestVersion: 1,
  institutionCode: 'CWIT',
  departmentCode: 'COMP',
  programmeCode: 'DCOMP',
  officialProgrammeCode: 'CP',
  schemeCode: 'R23',
  semesterNumber: 1,
  status: 'draft',
  verificationStatus: 'structure_verified',
  sourceReferences: [{ sourceId: 'comp-r23-structure', pages: [1] }],
  subjects: [
    {
      order: 1,
      officialSubjectCode: 'R23CP1701',
      name: 'Basic Mathematics',
      category: 'AEC',
      credits: 4,
      assessment: { totalMarks: 125 },
      units: [],
      outcomes: [],
      practicalExperiments: [],
      sourceReferences: [{ sourceId: 'comp-r23-structure', pages: [1] }],
      verificationStatus: 'structure_verified',
    },
  ],
}

describe('curriculum manifest validation', () => {
  it('accepts a sourced manifest with governed subject codes', () => {
    expect(validateCurriculumManifest(validManifest).valid).toBe(true)
  })

  it('rejects duplicate subject codes', () => {
    const manifest = {
      ...validManifest,
      subjects: [validManifest.subjects[0], { ...validManifest.subjects[0], order: 2 }],
    }

    const result = validateCurriculumManifest(manifest)

    expect(result.valid).toBe(false)
    expect(result.errors.join('\n')).toContain('duplicates R23CP1701')
  })

  it('allows an explicit draft blocker manifest with no subjects', () => {
    const result = validateCurriculumManifest({
      ...validManifest,
      status: 'draft',
      verificationStatus: 'needs_official_source',
      subjects: [],
      manifestNotes: [
        'Official semester-placement evidence is missing; this manifest is intentionally empty and blocked.',
      ],
    })

    expect(result.valid).toBe(true)
  })

  it('rejects empty subjects for importable manifests', () => {
    const result = validateCurriculumManifest({
      ...validManifest,
      status: 'ready_for_import',
      verificationStatus: 'structure_verified',
      subjects: [],
    })

    expect(result.valid).toBe(false)
    expect(result.errors.join('\n')).toContain('may be empty only')
  })
})

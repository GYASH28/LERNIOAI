export const CURRICULUM_VERIFICATION_STATUSES = [
  'draft',
  'needs_official_source',
  'structure_verified',
  'content_verified',
  'published',
] as const

type VerificationStatus = (typeof CURRICULUM_VERIFICATION_STATUSES)[number]

interface SourceReference {
  sourceId?: unknown
  title?: unknown
  sourceUrl?: unknown
  localPath?: unknown
  pages?: unknown
  evidence?: unknown
}

interface ManifestSubject {
  order?: unknown
  officialSubjectCode?: unknown
  name?: unknown
  category?: unknown
  credits?: unknown
  assessment?: { totalMarks?: unknown } | unknown
  units?: unknown
  outcomes?: unknown
  practicalExperiments?: unknown
  sourceReferences?: unknown
  verificationStatus?: unknown
}

interface CurriculumManifest {
  manifestVersion?: unknown
  institutionCode?: unknown
  departmentCode?: unknown
  programmeCode?: unknown
  officialProgrammeCode?: unknown
  schemeCode?: unknown
  semesterNumber?: unknown
  status?: unknown
  verificationStatus?: unknown
  sourceReferences?: unknown
  subjects?: unknown
}

export interface ManifestValidationResult {
  valid: boolean
  errors: string[]
}

export function validateCurriculumManifest(
  raw: unknown,
  label = 'manifest',
): ManifestValidationResult {
  const errors: string[] = []
  if (!isRecord(raw)) {
    return { valid: false, errors: [`${label}: manifest must be an object.`] }
  }

  const manifest = raw as CurriculumManifest
  requireString(manifest.institutionCode, `${label}.institutionCode`, errors)
  requireString(manifest.departmentCode, `${label}.departmentCode`, errors)
  requireString(manifest.programmeCode, `${label}.programmeCode`, errors)
  requireString(manifest.officialProgrammeCode, `${label}.officialProgrammeCode`, errors)
  requireString(manifest.schemeCode, `${label}.schemeCode`, errors)
  requireVerificationStatus(manifest.verificationStatus, `${label}.verificationStatus`, errors)

  if (!Number.isInteger(manifest.manifestVersion) || Number(manifest.manifestVersion) < 1) {
    errors.push(`${label}.manifestVersion must be a positive integer.`)
  }
  if (!Number.isInteger(manifest.semesterNumber) || Number(manifest.semesterNumber) < 1 || Number(manifest.semesterNumber) > 6) {
    errors.push(`${label}.semesterNumber must be an integer from 1 to 6.`)
  }
  if (!Array.isArray(manifest.sourceReferences) || manifest.sourceReferences.length === 0) {
    errors.push(`${label}.sourceReferences must contain at least one source.`)
  } else {
    manifest.sourceReferences.forEach((source, index) =>
      validateSourceReference(source, `${label}.sourceReferences[${index}]`, errors),
    )
  }

  if (!Array.isArray(manifest.subjects) || manifest.subjects.length === 0) {
    errors.push(`${label}.subjects must contain at least one subject.`)
  } else {
    validateSubjects(manifest.subjects as ManifestSubject[], label, errors)
  }

  return { valid: errors.length === 0, errors }
}

function validateSubjects(subjects: ManifestSubject[], label: string, errors: string[]) {
  const codes = new Set<string>()
  const orders = new Set<number>()

  subjects.forEach((subject, index) => {
    const path = `${label}.subjects[${index}]`
    if (!Number.isInteger(subject.order) || Number(subject.order) < 1) {
      errors.push(`${path}.order must be a positive integer.`)
    } else if (orders.has(Number(subject.order))) {
      errors.push(`${path}.order duplicates order ${subject.order}.`)
    } else {
      orders.add(Number(subject.order))
    }

    if (typeof subject.officialSubjectCode !== 'string' || !/^R23(CP|CI)\d{4}$/.test(subject.officialSubjectCode)) {
      errors.push(`${path}.officialSubjectCode must match R23CP#### or R23CI####.`)
    } else if (codes.has(subject.officialSubjectCode)) {
      errors.push(`${path}.officialSubjectCode duplicates ${subject.officialSubjectCode}.`)
    } else {
      codes.add(subject.officialSubjectCode)
    }

    requireString(subject.name, `${path}.name`, errors)
    requireString(subject.category, `${path}.category`, errors)
    requireVerificationStatus(subject.verificationStatus, `${path}.verificationStatus`, errors)
    if (subject.credits !== null && subject.credits !== undefined && (!Number.isFinite(subject.credits) || Number(subject.credits) <= 0)) {
      errors.push(`${path}.credits must be a positive number when present.`)
    }
    if (!isRecord(subject.assessment)) {
      errors.push(`${path}.assessment must be an object.`)
    } else if (!Number.isInteger(subject.assessment.totalMarks) || Number(subject.assessment.totalMarks) <= 0) {
      errors.push(`${path}.assessment.totalMarks must be a positive integer.`)
    }
    validateArrayField(subject.units, `${path}.units`, errors)
    validateArrayField(subject.outcomes, `${path}.outcomes`, errors)
    validateArrayField(subject.practicalExperiments, `${path}.practicalExperiments`, errors)
    if (!Array.isArray(subject.sourceReferences) || subject.sourceReferences.length === 0) {
      errors.push(`${path}.sourceReferences must contain source evidence.`)
    } else {
      subject.sourceReferences.forEach((source, sourceIndex) =>
        validateSourceReference(source, `${path}.sourceReferences[${sourceIndex}]`, errors),
      )
    }
  })
}

function validateSourceReference(source: unknown, path: string, errors: string[]) {
  if (!isRecord(source)) {
    errors.push(`${path} must be an object.`)
    return
  }
  const current = source as SourceReference
  requireString(current.sourceId, `${path}.sourceId`, errors)
  if (current.pages !== undefined) {
    if (!Array.isArray(current.pages) || current.pages.some((page) => !Number.isInteger(page) || Number(page) < 1)) {
      errors.push(`${path}.pages must contain positive page numbers when present.`)
    }
  }
}

function requireString(value: unknown, path: string, errors: string[]) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    errors.push(`${path} must be a non-empty string.`)
  }
}

function requireVerificationStatus(value: unknown, path: string, errors: string[]) {
  if (typeof value !== 'string' || !CURRICULUM_VERIFICATION_STATUSES.includes(value as VerificationStatus)) {
    errors.push(`${path} must be a governed verification status.`)
  }
}

function validateArrayField(value: unknown, path: string, errors: string[]) {
  if (!Array.isArray(value)) errors.push(`${path} must be an array.`)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

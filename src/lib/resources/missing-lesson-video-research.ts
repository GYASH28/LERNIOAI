import { createHash } from 'node:crypto'

export type OfficialUnitForResearch = {
  order: number
  title: string
  curriculumContent?: string
  learningOutcomes?: string[]
  sourcePages?: number[]
}

export type OfficialSubjectForResearch = {
  programmeCode: string
  semesterNumber: number
  departmentCode: string
  subjectCode: string
  subjectName: string
  sourceUrl: string
  sourcePages?: number[]
  units: OfficialUnitForResearch[]
  courseOutcomes?: Array<{ text?: string }>
}

export type ReconciledLessonVideo = {
  subjectCode: string
  officialProgrammeCode: string
  officialLessonSlug: string
}

export interface MissingLessonVideoResearchItem {
  id: string
  programmeCode: string
  semesterNumber: number
  departmentCode: string
  subjectCode: string
  subjectName: string
  unitNumber: number
  lessonSlug: string
  lessonTitle: string
  officialScope: string
  learningOutcomes: string[]
  sourceUrl: string
  sourcePages: number[]
  allowedLanguages: ['en', 'hi', 'hinglish']
  preferredChannels: string[]
  youtubeSearchUrl: string
  reviewerChecklist: string[]
}

export interface MissingLessonVideoResearchQueue {
  version: 1
  generatedAt: string
  status: 'research_required'
  policy: {
    publication: string
    allowedLanguages: ['en', 'hi', 'hinglish']
  }
  totals: {
    officialLessons: number
    lessonsWithPendingCandidate: number
    lessonsNeedingResearch: number
  }
  items: MissingLessonVideoResearchItem[]
}

export function buildMissingLessonVideoResearchQueue(input: {
  officialSubjects: OfficialSubjectForResearch[]
  reconciled: ReconciledLessonVideo[]
  generatedAt?: string
}): MissingLessonVideoResearchQueue {
  const assigned = new Set(input.reconciled.map((candidate) =>
    lessonKey(candidate.officialProgrammeCode, candidate.subjectCode, candidate.officialLessonSlug),
  ))
  const lessons = input.officialSubjects.flatMap((subject) => lessonsForSubject(subject, input.officialSubjects))
  const items = lessons
    .filter((lesson) => !assigned.has(lessonKey(lesson.programmeCode, lesson.subjectCode, lesson.lessonSlug)))
    .map((lesson) => toResearchItem(lesson))
    .sort((left, right) =>
      left.semesterNumber - right.semesterNumber ||
      left.programmeCode.localeCompare(right.programmeCode) ||
      left.subjectCode.localeCompare(right.subjectCode) ||
      left.unitNumber - right.unitNumber,
    )

  return {
    version: 1,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    status: 'research_required',
    policy: {
      publication: 'Research rows are not student-visible. A named reviewer must verify and promote a direct video before it appears in a lesson.',
      allowedLanguages: ['en', 'hi', 'hinglish'],
    },
    totals: {
      officialLessons: lessons.length,
      lessonsWithPendingCandidate: lessons.length - items.length,
      lessonsNeedingResearch: items.length,
    },
    items,
  }
}

interface OfficialLessonForResearch {
  programmeCode: string
  semesterNumber: number
  departmentCode: string
  subjectCode: string
  subjectName: string
  unitNumber: number
  lessonSlug: string
  lessonTitle: string
  officialScope: string
  learningOutcomes: string[]
  sourceUrl: string
  sourcePages: number[]
}

function lessonsForSubject(
  subject: OfficialSubjectForResearch,
  allSubjects: OfficialSubjectForResearch[],
): OfficialLessonForResearch[] {
  const evidence = subject.units.length > 0
    ? subject
    : allSubjects.find((candidate) => candidate.units.length > 0 && normalizedName(candidate.subjectName) === normalizedName(subject.subjectName)) ?? subject

  if (evidence.units.length === 0) {
    const outcomes = (subject.courseOutcomes ?? [])
      .map((outcome) => outcome.text?.trim())
      .filter((value): value is string => Boolean(value))
    if (outcomes.length === 0) return []
    return [{
      programmeCode: subject.programmeCode,
      semesterNumber: subject.semesterNumber,
      departmentCode: subject.departmentCode,
      subjectCode: subject.subjectCode.toUpperCase(),
      subjectName: subject.subjectName,
      unitNumber: 1,
      lessonSlug: 'official-course-level-outcomes',
      lessonTitle: 'Official course-level outcomes',
      officialScope: outcomes.join(' '),
      learningOutcomes: outcomes,
      sourceUrl: subject.sourceUrl,
      sourcePages: subject.sourcePages ?? [],
    }]
  }

  return evidence.units.map((unit) => ({
    programmeCode: subject.programmeCode,
    semesterNumber: subject.semesterNumber,
    departmentCode: subject.departmentCode,
    subjectCode: subject.subjectCode.toUpperCase(),
    subjectName: subject.subjectName,
    unitNumber: unit.order,
    lessonSlug: `unit-${unit.order}-${slugify(unit.title) || 'official-curriculum-unit'}`,
    lessonTitle: unit.title,
    officialScope: unit.curriculumContent?.trim() || unit.title,
    learningOutcomes: unit.learningOutcomes ?? [],
    sourceUrl: subject.sourceUrl,
    sourcePages: unit.sourcePages ?? subject.sourcePages ?? [],
  }))
}

function toResearchItem(lesson: OfficialLessonForResearch): MissingLessonVideoResearchItem {
  const query = `${lesson.subjectName} ${lesson.lessonTitle} diploma tutorial`
  return {
    id: `cwitr23_gap_${stableId(`${lesson.programmeCode}:${lesson.subjectCode}:${lesson.lessonSlug}`)}`,
    programmeCode: lesson.programmeCode,
    semesterNumber: lesson.semesterNumber,
    departmentCode: lesson.departmentCode,
    subjectCode: lesson.subjectCode,
    subjectName: lesson.subjectName,
    unitNumber: lesson.unitNumber,
    lessonSlug: lesson.lessonSlug,
    lessonTitle: lesson.lessonTitle,
    officialScope: lesson.officialScope,
    learningOutcomes: lesson.learningOutcomes,
    sourceUrl: lesson.sourceUrl,
    sourcePages: lesson.sourcePages,
    allowedLanguages: ['en', 'hi', 'hinglish'],
    preferredChannels: preferredChannels(lesson.subjectName),
    youtubeSearchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
    reviewerChecklist: [
      'Choose one direct video that teaches this exact official unit, not only the broader subject.',
      'Confirm spoken English, Hindi, or Hinglish; do not rely only on the title or channel name.',
      'Watch enough to verify depth, public availability, embeddability, captions/restrictions, and useful timestamps.',
      'Record the named academic reviewer, rationale, final language, and decision before promotion.',
    ],
  }
}

function preferredChannels(subjectName: string) {
  const normalized = normalizedName(subjectName)
  if (/(english|communication skills|language)/.test(normalized)) {
    return ['BBC Learning English', 'English with Lucy', 'Dear Sir', 'Adda247']
  }
  if (/(programming|web|database|software|data structure|operating system)/.test(normalized)) {
    return ['Gate Smashers', 'Neso Academy', 'CodeWithHarry', "Jenny's Lectures CS IT", 'freeCodeCamp.org']
  }
  if (/(mathematics|calculus|statistics|numerical)/.test(normalized)) {
    return ['Kharat Academy', 'Gate Smashers', 'Gajendra Purohit', 'Neso Academy']
  }
  if (/(electronics|digital|microprocessor|communication|network|iot)/.test(normalized)) {
    return ['Gate Smashers', 'All About Electronics', 'Neso Academy', 'Ekeeda', '5 Minutes Engineering']
  }
  return ['Gate Smashers', 'Neso Academy', 'Simplilearn', 'Ekeeda', 'Easy Engineering Classes']
}

function lessonKey(programmeCode: string, subjectCode: string, lessonSlug: string) {
  return `${programmeCode.trim().toUpperCase()}:${subjectCode.trim().toUpperCase()}:${lessonSlug.trim()}`
}

function stableId(value: string) {
  return createHash('sha256').update(value).digest('hex').slice(0, 16)
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function normalizedName(value: string) {
  return value.toLowerCase().replace(/\b(and|its|it)\b/g, '').replace(/[^a-z0-9]+/g, '')
}

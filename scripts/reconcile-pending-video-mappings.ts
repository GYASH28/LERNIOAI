import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'

type PendingMapping = {
  subjectCode: string
  lessonSlug: string
  videoId: string
  title: string
  channel: string
  language: string
  description: string
  playlistId: string | null
  playlistIndex: number | null
  confidence: number
  reviewStatus: string
  sourcePdf: string
  sourcePage: number
  oembedStatus?: string
  oembedVerifiedAt?: string
  embeddabilityStatus?: string
  languageVerificationStatus?: string
  selectionRationale?: string
  curationStatus?: string
}

type ResearchedGapMapping = PendingMapping & {
  programmeCode: string
  semesterNumber: number
  unitNumber: number
  lessonTitle: string
  matchedTerms: string[]
  reviewerChecklist: string[]
}

type OfficialUnit = {
  order: number
  title: string
  curriculumContent?: string
  learningOutcomes?: string[]
}

type OfficialSubject = {
  subjectCode: string
  subjectName: string
  programmeCode: string
  semesterNumber: number
  sourceUrl: string
  units: OfficialUnit[]
  courseOutcomes?: Array<{ text?: string }>
}

type OfficialLesson = {
  subjectCode: string
  programmeCode: string
  semesterNumber: number
  unitNumber: number
  lessonSlug: string
  lessonTitle: string
  context: string
}

const root = process.cwd()
const inputPath = join(root, 'content', 'resources', 'lesson-video-mappings', 'cwit-r23-direct-video-mappings.json')
const officialPath = join(root, 'content', 'curriculum', 'cwit-r23', 'official-course-content.json')
const researchedGapPath = join(root, 'content', 'resources', 'lesson-video-mappings', 'cwit-r23-researched-gap-video-mappings.json')
const outputPath = join(root, 'content', 'resources', 'lesson-video-mappings', 'cwit-r23-pending-video-reconciliation.json')

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'into',
  'is', 'it', 'its', 'of', 'on', 'or', 'the', 'to', 'using', 'with', 'unit',
  'introduction', 'overview', 'basic', 'basics', 'concept', 'concepts', 'lecture',
  'lectures', 'tutorial', 'part', 'class', 'chapter', 'learn', 'course', 'video',
])

function main() {
  const input = JSON.parse(readFileSync(inputPath, 'utf8')) as { mappings?: PendingMapping[] }
  const official = JSON.parse(readFileSync(officialPath, 'utf8')) as { subjects?: OfficialSubject[] }
  const subjects = official.subjects ?? []
  const lessons = buildOfficialLessons(subjects)
  const lessonsBySubject = new Map<string, OfficialLesson[]>()
  for (const lesson of lessons) {
    const list = lessonsBySubject.get(lesson.subjectCode) ?? []
    list.push(lesson)
    lessonsBySubject.set(lesson.subjectCode, list)
  }

  const pending = (input.mappings ?? [])
    .filter((mapping) => mapping.reviewStatus === 'pending_review')
    .filter((mapping) => /^[\w-]{11}$/.test(mapping.videoId))
    .filter((mapping) => ['en', 'hi', 'hinglish'].includes(mapping.language.toLowerCase()))
  const researchedGaps = existsSync(researchedGapPath)
    ? (JSON.parse(readFileSync(researchedGapPath, 'utf8')) as { mappings?: ResearchedGapMapping[] }).mappings ?? []
    : []

  const assignedBySubject = new Map<string, Set<string>>()
  const usedVideoBySubject = new Map<string, Set<string>>()
  const reconciled: Array<PendingMapping & {
    officialProgrammeCode: string
    officialSemesterNumber: number
    officialUnitNumber: number
    officialLessonSlug: string
    officialLessonTitle: string
    matchedTerms: string[]
    reconciliationScore: number
    reconciliationStatus: 'pending_academic_review'
    reviewChecklist: string[]
  }> = []
  const unmatched: Array<PendingMapping & { reason: string; bestScore: number }> = []

  const ordered = [...pending].sort((left, right) => right.confidence - left.confidence || left.subjectCode.localeCompare(right.subjectCode))
  for (const mapping of ordered) {
    const subjectCode = mapping.subjectCode.trim().toUpperCase()
    const candidates = lessonsBySubject.get(subjectCode) ?? []
    const usedLessons = assignedBySubject.get(subjectCode) ?? new Set<string>()
    const usedVideos = usedVideoBySubject.get(subjectCode) ?? new Set<string>()
    if (usedVideos.has(mapping.videoId)) continue

    const scored = candidates
      .filter((lesson) => !usedLessons.has(lesson.lessonSlug))
      .map((lesson) => ({ lesson, ...score(mapping, lesson) }))
      .sort((left, right) => right.total - left.total || right.titleOverlap - left.titleOverlap)
    const best = scored[0]
    if (!best || best.titleOverlap === 0 || best.total < 7) {
      unmatched.push({
        ...mapping,
        reason: best ? 'No sufficiently specific official-unit match; keep unassigned until manual review.' : 'No official lesson exists for this subject.',
        bestScore: best?.total ?? 0,
      })
      continue
    }

    reconciled.push({
      ...mapping,
      officialProgrammeCode: best.lesson.programmeCode,
      officialSemesterNumber: best.lesson.semesterNumber,
      officialUnitNumber: best.lesson.unitNumber,
      officialLessonSlug: best.lesson.lessonSlug,
      officialLessonTitle: best.lesson.lessonTitle,
      matchedTerms: best.matchedTerms,
      reconciliationScore: best.total,
      reconciliationStatus: 'pending_academic_review',
      reviewChecklist: [
        'Watch the selected video and verify that it teaches the official unit outcome—not only a related topic.',
        'Confirm spoken language is English, Hindi, or Hinglish and the depth matches diploma learners.',
        'Confirm public embeddability, availability, captions/restrictions, and useful start/end timestamps.',
        'Record a named academic reviewer, rationale, and decision before promotion.',
      ],
    })
    usedLessons.add(best.lesson.lessonSlug)
    usedVideos.add(mapping.videoId)
    assignedBySubject.set(subjectCode, usedLessons)
    usedVideoBySubject.set(subjectCode, usedVideos)
  }

  for (const mapping of researchedGaps) {
    const subjectCode = mapping.subjectCode.trim().toUpperCase()
    const exactLesson = (lessonsBySubject.get(subjectCode) ?? []).find((lesson) =>
      lesson.programmeCode.toUpperCase() === mapping.programmeCode.trim().toUpperCase() &&
      lesson.lessonSlug === mapping.lessonSlug,
    )
    if (!exactLesson || !/^[\w-]{11}$/.test(mapping.videoId) || !['en', 'hi', 'hinglish'].includes(mapping.language.toLowerCase())) {
      unmatched.push({
        ...mapping,
        reason: exactLesson
          ? 'Researched gap candidate failed video ID or language validation.'
          : 'Researched gap candidate no longer matches an exact official lesson.',
        bestScore: 0,
      })
      continue
    }
    const exactKey = `${exactLesson.programmeCode}:${subjectCode}:${exactLesson.lessonSlug}`
    if (reconciled.some((candidate) =>
      `${candidate.officialProgrammeCode}:${candidate.subjectCode}:${candidate.officialLessonSlug}` === exactKey,
    )) continue

    reconciled.push({
      ...mapping,
      officialProgrammeCode: exactLesson.programmeCode,
      officialSemesterNumber: exactLesson.semesterNumber,
      officialUnitNumber: exactLesson.unitNumber,
      officialLessonSlug: exactLesson.lessonSlug,
      officialLessonTitle: exactLesson.lessonTitle,
      matchedTerms: mapping.matchedTerms ?? [],
      reconciliationScore: Math.max(7, Math.round(mapping.confidence * 100)),
      reconciliationStatus: 'pending_academic_review',
      reviewChecklist: mapping.reviewerChecklist ?? [
        'Watch the selected video and verify that it teaches the official unit outcome—not only a related topic.',
        'Confirm spoken language is English, Hindi, or Hinglish and the depth matches diploma learners.',
        'Confirm public embeddability, availability, captions/restrictions, and useful start/end timestamps.',
        'Record a named academic reviewer, rationale, and decision before promotion.',
      ],
    })
  }

  const coverage = [...lessonsBySubject.entries()]
    .map(([subjectCode, subjectLessons]) => ({
      subjectCode,
      officialLessons: subjectLessons.length,
      reconciledPendingCandidates: reconciled.filter((candidate) => candidate.subjectCode.toUpperCase() === subjectCode).length,
      unmatchedCandidates: unmatched.filter((candidate) => candidate.subjectCode.toUpperCase() === subjectCode).length,
    }))
    .sort((left, right) => left.subjectCode.localeCompare(right.subjectCode))

  const output = {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: relative(root, inputPath).replaceAll('\\', '/'),
    researchedGapSource: existsSync(researchedGapPath) ? relative(root, researchedGapPath).replaceAll('\\', '/') : null,
    officialCurriculumSource: relative(root, officialPath).replaceAll('\\', '/'),
    policy: {
      publication: 'No row in this file is student-visible or approved.',
      allowedLanguages: ['en', 'hi', 'hinglish'],
      oneCandidatePerOfficialLesson: true,
      oneCandidateVideoPerSubject: true,
    },
    summary: {
      inputPendingCandidates: pending.length + researchedGaps.length,
      reconciledPendingCandidates: reconciled.length,
      unmatchedCandidates: unmatched.length,
      officialLessons: lessons.length,
    },
    coverage,
    reconciled: reconciled.sort((left, right) => left.subjectCode.localeCompare(right.subjectCode) || left.officialLessonSlug.localeCompare(right.officialLessonSlug)),
    unmatched,
  }

  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
  console.warn(`[youtube-reconcile] wrote ${reconciled.length} reconciled pending candidate(s) and ${unmatched.length} unmatched candidate(s) to ${relative(root, outputPath)}`)
}

function buildOfficialLessons(subjects: OfficialSubject[]): OfficialLesson[] {
  return subjects.flatMap((subject) => {
    const evidence = subject.units.length > 0
      ? subject
      : subjects.find((candidate) => candidate.units.length > 0 && normalizeCourseName(candidate.subjectName) === normalizeCourseName(subject.subjectName)) ?? subject
    if (evidence.units.length === 0) {
      const outcomes = (subject.courseOutcomes ?? []).map((outcome) => outcome.text?.trim()).filter((value): value is string => Boolean(value))
      return outcomes.length ? [{
        subjectCode: subject.subjectCode.toUpperCase(),
        programmeCode: subject.programmeCode,
        semesterNumber: subject.semesterNumber,
        unitNumber: 1,
        lessonSlug: 'official-course-level-outcomes',
        lessonTitle: 'Official course-level outcomes',
        context: outcomes.join(' '),
      }] : []
    }
    return evidence.units.map((unit) => ({
      subjectCode: subject.subjectCode.toUpperCase(),
      programmeCode: subject.programmeCode,
      semesterNumber: subject.semesterNumber,
      unitNumber: unit.order,
      lessonSlug: `unit-${unit.order}-${slugify(unit.title) || 'official-curriculum-unit'}`,
      lessonTitle: unit.title,
      context: [unit.title, unit.curriculumContent ?? '', ...(unit.learningOutcomes ?? [])].join(' '),
    }))
  })
}

function score(mapping: PendingMapping, lesson: OfficialLesson) {
  const titleTokens = tokens(`${mapping.lessonSlug} ${mapping.title}`)
  const contextTokens = tokens(`${mapping.description} ${lesson.context}`)
  const lessonTitleTokens = tokens(lesson.lessonTitle)
  const matchedTerms = [...lessonTitleTokens].filter((token) => titleTokens.has(token))
  const titleOverlap = matchedTerms.length
  const contextOverlap = [...contextTokens].filter((token) => titleTokens.has(token)).length
  return {
    titleOverlap,
    total: titleOverlap * 4 + contextOverlap,
    matchedTerms,
  }
}

function tokens(value: string) {
  return new Set(value
    .toLowerCase()
    .replace(/[^a-z0-9+#]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token)))
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function normalizeCourseName(value: string) {
  return value.toLowerCase().replace(/\b(and|its|it)\b/g, '').replace(/[^a-z0-9]+/g, '')
}

main()

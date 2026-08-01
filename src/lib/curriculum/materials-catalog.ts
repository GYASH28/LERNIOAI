import 'server-only'

import {
  findLessonBySlug,
  getAvailableNotesSubjects,
  getSubjectNotes,
  normalizeLessonSlug,
  type Lesson,
  type SubjectNotes,
  type Unit,
} from '@/lib/curriculum/lesson-notes-loader'

export interface MaterialsCatalogLesson {
  slug: string
  title: string
  durationMin: number
  difficulty: string
  practiceQuestionCount: number
  flashcardCount: number
  sectionCount: number
}

export interface MaterialsCatalogUnit {
  number: number
  title: string
  weightage: number
  lessons: MaterialsCatalogLesson[]
}

export interface MaterialsCatalogSubject {
  code: string
  name: string
  semester: number
  credits: number
  unitCount: number
  lessonCount: number
  practiceQuestionCount: number
  flashcardCount: number
  units: MaterialsCatalogUnit[]
}

export interface ResolvedMaterialsLesson {
  lesson: Lesson
  unit: Unit
  subject: SubjectNotes
}

export function getMaterialsCatalog(): MaterialsCatalogSubject[] {
  return getAvailableNotesSubjects()
    .map(({ code }) => getSubjectNotes(code))
    .filter((subject): subject is SubjectNotes => Boolean(subject))
    .map(toCatalogSubject)
    .sort((left, right) => {
      if (left.semester !== right.semester) return left.semester - right.semester
      return left.name.localeCompare(right.name)
    })
}

/**
 * Resolves old bookmarks and links without accepting fuzzy substring matches.
 * Exact slugs win; title equality is only a compatibility fallback for DB
 * lessons whose public route contains an internal lesson id.
 */
export function resolveMaterialsLesson(
  subjectCode: string,
  lessonHint: string,
): ResolvedMaterialsLesson | null {
  const subject = getSubjectNotes(subjectCode)
  if (!subject) return null

  const decodedHint = safeDecode(lessonHint)
  const direct = findLessonBySlug(subject.subjectCode, decodedHint)
  if (direct) return direct

  const normalizedHint = normalizeLessonSlug(stripRouteId(decodedHint))
  if (!normalizedHint) return null

  for (const unit of subject.units) {
    for (const lesson of unit.lessons) {
      if (
        normalizeLessonSlug(lesson.slug) === normalizedHint ||
        normalizeLessonSlug(lesson.title) === normalizedHint
      ) {
        return { lesson, unit, subject }
      }
    }
  }

  return null
}

export function canonicalMaterialsHref(subjectCode: string, lessonSlug: string) {
  return `/materials/lesson/${encodeURIComponent(subjectCode)}/${encodeURIComponent(lessonSlug)}`
}

function toCatalogSubject(subject: SubjectNotes): MaterialsCatalogSubject {
  const units = subject.units.map((unit) => ({
    number: unit.number,
    title: unit.title,
    weightage: unit.weightage,
    lessons: unit.lessons.map((lesson) => ({
      slug: lesson.slug,
      title: lesson.title,
      durationMin: lesson.durationMin,
      difficulty: lesson.difficulty,
      practiceQuestionCount: lesson.practiceQuestions?.length ?? 0,
      flashcardCount: lesson.flashcards?.length ?? 0,
      sectionCount: countLessonSections(lesson),
    })),
  }))

  const lessons = units.flatMap((unit) => unit.lessons)

  return {
    code: subject.subjectCode,
    name: subject.subjectName,
    semester: subject.semester,
    credits: subject.credits,
    unitCount: units.length,
    lessonCount: lessons.length,
    practiceQuestionCount: lessons.reduce(
      (total, lesson) => total + lesson.practiceQuestionCount,
      0,
    ),
    flashcardCount: lessons.reduce(
      (total, lesson) => total + lesson.flashcardCount,
      0,
    ),
    units,
  }
}

function countLessonSections(lesson: Lesson) {
  return [
    lesson.overview,
    lesson.objectives?.length,
    lesson.prerequisites?.length,
    lesson.theory,
    lesson.keyConcepts?.length,
    lesson.analogies?.length,
    lesson.flowcharts?.length,
    lesson.mindMaps?.length,
    lesson.tables?.length,
    lesson.diagrams?.length,
    lesson.codeExamples?.length,
    lesson.complexity,
    lesson.workedExamples?.length,
    lesson.commonMistakes?.length,
    lesson.callouts?.length,
    lesson.vivaQuestions?.length,
    lesson.interviewQuestions?.length,
    lesson.examQuestions?.length,
    lesson.formulas?.length,
    lesson.revisionSummary,
    lesson.cheatSheet?.length,
    lesson.mnemonics?.length,
    lesson.practiceQuestions?.length,
    lesson.flashcards?.length,
    lesson.aiSummaries?.length,
  ].filter(Boolean).length
}

function stripRouteId(value: string) {
  return value.replace(/--[a-z0-9_-]{8,}$/i, '')
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

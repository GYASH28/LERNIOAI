import 'server-only'

import { db } from '@/lib/db'
import { getStudentLearningScope, hasResolvedLearningScope, type LearningSubject } from './get-student-learning-scope'
import { lessonRouteSlug } from '../utils/lesson-slugs'

export interface SemesterOverviewSubject {
  id: string
  code: string
  name: string
  category: string | null
  credits: number
  accentColor: string
  unitCount: number
  topicCount: number
  lessonCount: number
  completedLessonCount: number
  durationMinutes: number
}

export interface SemesterOverview {
  programme: { code: string; name: string }
  department: { code: string; name: string }
  scheme: { code: string; name: string; status: string }
  semester: { number: number; name: string }
  subjects: SemesterOverviewSubject[]
  continueLearning: {
    subjectCode: string
    subjectName: string
    unitNumber: number
    lessonTitle: string
    mode: string
    href: string
    lastVisited: Date
    scrollPos: number
  } | null
  totals: {
    subjectCount: number
    unitCount: number
    topicCount: number
    lessonCount: number
    completedLessonCount: number
    completionPercent: number
    durationMinutes: number
  }
}

export async function getSemesterOverview(
  userId: string,
  input: { programmeCode: string; semesterNumber: number },
): Promise<SemesterOverview | null> {
  const scope = await getStudentLearningScope(userId)
  if (!hasResolvedLearningScope(scope)) return null

  if (scope.programme.code.toUpperCase() !== input.programmeCode.trim().toUpperCase()) {
    return null
  }
  if (scope.semester.number !== input.semesterNumber) return null

  const lessonRefs = scope.subjects.flatMap((subject) =>
    subject.units.flatMap((unit) =>
      unitLessons(unit).map((lesson) => ({ subject, unit, lesson })),
    ),
  )
  const lessonIds = lessonRefs.map((ref) => ref.lesson.id)
  const completions = lessonIds.length
    ? await db.lessonCompletion.findMany({
        where: {
          userId,
          lessonId: { in: lessonIds },
          completedAt: { not: null },
        },
        select: { lessonId: true },
      })
    : []
  const continueRecord = lessonIds.length
    ? await db.lessonCompletion.findFirst({
        where: {
          userId,
          lessonId: { in: lessonIds },
          lastVisited: { not: null },
        },
        orderBy: { lastVisited: 'desc' },
        select: {
          lessonId: true,
          mode: true,
          scrollPos: true,
          lastVisited: true,
        },
      })
    : null
  const completedLessonIds = new Set(completions.map((completion) => completion.lessonId))
  const continueRef = continueRecord
    ? lessonRefs.find((ref) => ref.lesson.id === continueRecord.lessonId) ?? null
    : null

  const subjects = scope.subjects.map((subject) => {
    const lessons = subject.units.flatMap(unitLessons)
    const completedLessonCount = lessons.filter((lesson) => completedLessonIds.has(lesson.id)).length
    return {
      id: subject.id,
      code: subject.code,
      name: subject.name,
      category: subject.category,
      credits: subject.credits,
      accentColor: subject.accentColor,
      unitCount: subject.units.length,
      topicCount: subject.units.reduce((sum, unit) => sum + unit.topics.length, 0),
      lessonCount: lessons.length,
      completedLessonCount,
      durationMinutes: lessons.reduce((sum, lesson) => sum + (lesson.durationMin ?? 0), 0),
    }
  })

  const lessonCount = subjects.reduce((sum, subject) => sum + subject.lessonCount, 0)
  const completedLessonCount = subjects.reduce((sum, subject) => sum + subject.completedLessonCount, 0)

  return {
    programme: scope.programme,
    department: scope.department,
    scheme: scope.scheme,
    semester: { number: scope.semester.number, name: scope.semester.name },
    subjects,
    continueLearning: continueRecord?.lastVisited && continueRef
      ? {
          subjectCode: continueRef.subject.code,
          subjectName: continueRef.subject.name,
          unitNumber: continueRef.unit.number,
          lessonTitle: continueRef.lesson.title,
          mode: continueRecord.mode,
          href: `/learn/${scope.programme.code}/semester/${scope.semester.number}/subject/${continueRef.subject.code}/lesson/${lessonRouteSlug(continueRef.lesson)}`,
          lastVisited: continueRecord.lastVisited,
          scrollPos: continueRecord.scrollPos,
        }
      : null,
    totals: {
      subjectCount: subjects.length,
      unitCount: subjects.reduce((sum, subject) => sum + subject.unitCount, 0),
      topicCount: subjects.reduce((sum, subject) => sum + subject.topicCount, 0),
      lessonCount,
      completedLessonCount,
      completionPercent: lessonCount ? Math.round((completedLessonCount / lessonCount) * 100) : 0,
      durationMinutes: subjects.reduce((sum, subject) => sum + subject.durationMinutes, 0),
    },
  }
}

function unitLessons(unit: LearningSubject['units'][number]) {
  const lessons = new Map<string, LearningSubject['units'][number]['lessons'][number]>()
  for (const topic of unit.topics) {
    for (const lesson of topic.lessons ?? []) {
      lessons.set(lesson.id, lesson)
    }
  }
  for (const lesson of unit.lessons) {
    lessons.set(lesson.id, lesson)
  }
  return Array.from(lessons.values())
}

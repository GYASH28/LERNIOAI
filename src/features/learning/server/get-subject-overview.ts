import 'server-only'

import { db } from '@/lib/db'
import { getStudentLearningScope, hasResolvedLearningScope, type LearningSubject } from './get-student-learning-scope'

export interface SubjectOverview {
  programme: { code: string; name: string }
  semester: { number: number; name: string }
  subject: {
    id: string
    code: string
    name: string
    category: string | null
    credits: number
    accentColor: string
    description: string | null
  }
  units: Array<{
    id: string
    number: number
    title: string
    topicCount: number
    lessonCount: number
    completedLessonCount: number
    lessons: Array<{
      id: string
      title: string
      order: number
      durationMin: number
      topicTitle: string | null
    }>
    topics: Array<{
      id: string
      slug: string
      title: string
      difficulty: string
      examWeightage: number
      lessons: Array<{ id: string; title: string; order: number; durationMin: number }>
    }>
  }>
  totals: {
    topicCount: number
    lessonCount: number
    completedLessonCount: number
    completionPercent: number
  }
}

export async function getSubjectOverview(
  userId: string,
  input: { programmeCode: string; semesterNumber: number; subjectCode: string },
): Promise<SubjectOverview | null> {
  const scope = await getStudentLearningScope(userId)
  if (!hasResolvedLearningScope(scope)) return null
  if (scope.programme.code.toUpperCase() !== input.programmeCode.trim().toUpperCase()) return null
  if (scope.semester.number !== input.semesterNumber) return null

  const subject = scope.subjects.find(
    (item) => item.code.toUpperCase() === input.subjectCode.trim().toUpperCase(),
  )
  if (!subject) return null

  const lessonIds = subject.units.flatMap((unit) => unitLessons(unit).map((lesson) => lesson.id))
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
  const completedLessonIds = new Set(completions.map((completion) => completion.lessonId))

  const units = subject.units.map((unit) => {
    const lessons = unitLessons(unit)
    const completedLessonCount = lessons.filter((lesson) => completedLessonIds.has(lesson.id)).length
    return {
      id: unit.id,
      number: unit.number,
      title: unit.title,
      topicCount: unit.topics.length,
      lessonCount: lessons.length,
      completedLessonCount,
      lessons: lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        order: lesson.order,
        durationMin: lesson.durationMin,
        topicTitle: lesson.topicTitle,
      })),
      topics: unit.topics.map((topic) => ({
        id: topic.id,
        slug: topic.slug,
        title: topic.title,
        difficulty: topic.difficulty,
        examWeightage: topic.examWeightage,
        lessons: topic.lessons.map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          order: lesson.order,
          durationMin: lesson.durationMin,
        })),
      })),
    }
  })

  const lessonCount = units.reduce((sum, unit) => sum + unit.lessonCount, 0)
  const completedLessonCount = units.reduce((sum, unit) => sum + unit.completedLessonCount, 0)

  return {
    programme: scope.programme,
    semester: { number: scope.semester.number, name: scope.semester.name },
    subject: {
      id: subject.id,
      code: subject.code,
      name: subject.name,
      category: subject.category,
      credits: subject.credits,
      accentColor: subject.accentColor,
      description: subject.description,
    },
    units,
    totals: {
      topicCount: units.reduce((sum, unit) => sum + unit.topicCount, 0),
      lessonCount,
      completedLessonCount,
      completionPercent: lessonCount ? Math.round((completedLessonCount / lessonCount) * 100) : 0,
    },
  }
}

function unitLessons(unit: LearningSubject['units'][number]) {
  const lessons = new Map<string, LearningSubject['units'][number]['lessons'][number] & { topicTitle: string | null }>()
  const topicTitles = new Map(unit.topics.map((topic) => [topic.id, topic.title]))
  for (const topic of unit.topics) {
    for (const lesson of topic.lessons ?? []) {
      lessons.set(lesson.id, { ...lesson, topicTitle: topic.title })
    }
  }
  for (const lesson of unit.lessons) {
    lessons.set(lesson.id, {
      ...lesson,
      topicTitle: lesson.topicId ? topicTitles.get(lesson.topicId) ?? null : null,
    })
  }
  return Array.from(lessons.values()).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
}

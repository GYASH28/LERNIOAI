import type { Lesson, Subject, User } from '@/lib/types'
import { lessonRouteSlug } from './lesson-slugs'

export interface ContinueLearningRouteInput {
  subjectId: string
  subjectCode: string
  unitNumber: number
  lessonId: string
}

export function programmeCodeForDepartment(departmentCode: string | null | undefined): string | null {
  const code = String(departmentCode || '').trim().toUpperCase()
  if (code === 'COMP') return 'DCOMP'
  if (code === 'CIOT') return 'DCIOT'
  return null
}

export function canonicalSemesterRouteForUser(user: Pick<User, 'departmentCode' | 'semesterNumber'> | null): string | null {
  const programmeCode = programmeCodeForDepartment(user?.departmentCode)
  if (!programmeCode || !user?.semesterNumber) return null
  return `/learn/${programmeCode}/semester/${user.semesterNumber}`
}

export function canonicalSubjectRouteForUser(
  user: Pick<User, 'departmentCode' | 'semesterNumber'> | null,
  subject: Pick<Subject, 'code'> | null | undefined,
): string | null {
  const semesterRoute = canonicalSemesterRouteForUser(user)
  if (!semesterRoute || !subject?.code) return null
  return `${semesterRoute}/subject/${subject.code}`
}

export function canonicalContinueLearningRoute(
  user: Pick<User, 'departmentCode' | 'semesterNumber'> | null,
  subjects: Subject[],
  input: ContinueLearningRouteInput | null | undefined,
): string | null {
  if (!input) return canonicalSemesterRouteForUser(user)

  const subject = subjects.find((item) => item.id === input.subjectId || item.code === input.subjectCode)
  const subjectRoute = canonicalSubjectRouteForUser(user, subject)
  if (!subjectRoute || !subject) return canonicalSemesterRouteForUser(user)

  const lesson = findLessonInSubject(subject, input.lessonId)
  if (lesson) return `${subjectRoute}/lesson/${lessonRouteSlug(lesson)}`
  if (input.unitNumber) return `${subjectRoute}/unit/${input.unitNumber}`
  return subjectRoute
}

export function findLessonInSubject(subject: Subject, lessonId: string | null | undefined): Lesson | null {
  if (!lessonId) return null
  for (const unit of subject.units) {
    for (const lesson of unit.lessons ?? []) {
      if (lesson.id === lessonId) return lesson
    }
    for (const topic of unit.topics) {
      for (const lesson of topic.lessons ?? []) {
        if (lesson.id === lessonId) return lesson
      }
    }
  }
  return null
}

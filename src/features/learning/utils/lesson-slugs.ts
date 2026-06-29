export interface LessonSlugSource {
  id: string
  title: string
  order?: number | null
}

const LESSON_ID_SEPARATOR = '--'

export function lessonTitleSlug(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

  return slug || 'lesson'
}

export function lessonRouteSlug(lesson: LessonSlugSource): string {
  const order = typeof lesson.order === 'number' && Number.isFinite(lesson.order)
    ? `${Math.max(lesson.order, 0)}-`
    : ''
  return `${order}${lessonTitleSlug(lesson.title)}${LESSON_ID_SEPARATOR}${lesson.id}`
}

export function lessonIdFromRouteSlug(routeSlug: string): string | null {
  const decoded = decodeURIComponent(routeSlug).trim()
  if (!decoded) return null

  const separatorIndex = decoded.lastIndexOf(LESSON_ID_SEPARATOR)
  if (separatorIndex >= 0) {
    const id = decoded.slice(separatorIndex + LESSON_ID_SEPARATOR.length).trim()
    return id || null
  }

  return /^[A-Za-z0-9_-]+$/.test(decoded) ? decoded : null
}

export function isCanonicalLessonRouteSlug(lesson: LessonSlugSource, routeSlug: string): boolean {
  return lessonRouteSlug(lesson) === decodeURIComponent(routeSlug).trim()
}

import { lessonRouteSlug } from './lesson-slugs'

export type LearningSearchResultKind = 'semester' | 'subject' | 'unit' | 'topic' | 'lesson' | 'resource' | 'notes'

export interface LearningSearchResult {
  id: string
  kind: LearningSearchResultKind
  title: string
  subtitle: string
  href: string
  programmeCode: string
  semesterNumber: number
  subjectCode?: string
  unitNumber?: number
  lessonId?: string
  resourceId?: string
  score: number
}

export interface LearningSearchScope {
  programme: { code: string; name: string }
  semester: { number: number; name: string }
  subjects: Array<{
    id: string
    code: string
    name: string
    shortName?: string | null
    units: Array<{
      id: string
      number: number
      title: string
      topics: Array<{
        id: string
        slug: string
        title: string
        lessons?: Array<{
          id: string
          title: string
          order: number
          durationMin?: number | null
          topicId?: string | null
          unitId?: string | null
        }>
      }>
      lessons?: Array<{
        id: string
        title: string
        order: number
        durationMin?: number | null
        topicId?: string | null
        unitId?: string | null
      }>
    }>
  }>
}

export function buildLearningSearchResults(
  scope: LearningSearchScope,
  query: string,
  options: { limit?: number } = {},
): LearningSearchResult[] {
  const normalizedQuery = normalizeSearchText(query)
  if (normalizedQuery.length < 2) return []

  const limit = Math.max(1, Math.min(options.limit ?? 20, 50))
  const results: LearningSearchResult[] = []
  const seen = new Set<string>()
  const semesterHref = semesterHrefFor(scope.programme.code, scope.semester.number)

  pushResult(results, seen, {
    id: `semester:${scope.programme.code}:${scope.semester.number}`,
    kind: 'semester',
    title: `${scope.programme.name} Semester ${scope.semester.number}`,
    subtitle: `${scope.programme.code} - ${scope.semester.name}`,
    href: semesterHref,
    programmeCode: scope.programme.code,
    semesterNumber: scope.semester.number,
    score: scoreMatch(normalizedQuery, [
      scope.programme.code,
      scope.programme.name,
      scope.semester.name,
      `semester ${scope.semester.number}`,
      `sem ${scope.semester.number}`,
      'learn',
    ]),
  })

  for (const subject of scope.subjects) {
    const subjectHref = `${semesterHref}/subject/${subject.code}`
    pushResult(results, seen, {
      id: `subject:${subject.id}`,
      kind: 'subject',
      title: subject.name,
      subtitle: `${subject.code} - Semester ${scope.semester.number}`,
      href: subjectHref,
      programmeCode: scope.programme.code,
      semesterNumber: scope.semester.number,
      subjectCode: subject.code,
      score: scoreMatch(normalizedQuery, [subject.code, subject.name, subject.shortName ?? '', 'subject']),
    })

    for (const unit of subject.units) {
      const unitHref = `${subjectHref}/unit/${unit.number}`
      pushResult(results, seen, {
        id: `unit:${unit.id}`,
        kind: 'unit',
        title: `Unit ${unit.number}: ${unit.title}`,
        subtitle: `${subject.code} - ${subject.name}`,
        href: unitHref,
        programmeCode: scope.programme.code,
        semesterNumber: scope.semester.number,
        subjectCode: subject.code,
        unitNumber: unit.number,
        score: scoreMatch(normalizedQuery, [unit.title, `unit ${unit.number}`, subject.code, subject.name]),
      })

      for (const topic of unit.topics) {
        pushResult(results, seen, {
          id: `topic:${topic.id}`,
          kind: 'topic',
          title: topic.title,
          subtitle: `${subject.code} - Unit ${unit.number}`,
          href: `${unitHref}#topic-${topic.slug || topic.id}`,
          programmeCode: scope.programme.code,
          semesterNumber: scope.semester.number,
          subjectCode: subject.code,
          unitNumber: unit.number,
          score: scoreMatch(normalizedQuery, [topic.title, topic.slug, unit.title, subject.code, subject.name, 'topic']),
        })

        for (const lesson of topic.lessons ?? []) {
          pushLessonResult(results, seen, {
            normalizedQuery,
            lesson,
            subject,
            unitNumber: unit.number,
            topicTitle: topic.title,
            subjectHref,
            programmeCode: scope.programme.code,
            semesterNumber: scope.semester.number,
          })
        }
      }

      for (const lesson of unit.lessons ?? []) {
        if (seen.has(`lesson:${lesson.id}`)) continue
        const topicTitle = lesson.topicId
          ? unit.topics.find((topic) => topic.id === lesson.topicId)?.title ?? null
          : null
        pushLessonResult(results, seen, {
          normalizedQuery,
          lesson,
          subject,
          unitNumber: unit.number,
          topicTitle,
          subjectHref,
          programmeCode: scope.programme.code,
          semesterNumber: scope.semester.number,
        })
      }
    }
  }

  return results
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.kind.localeCompare(b.kind) || a.title.localeCompare(b.title))
    .slice(0, limit)
}

export function buildLearningResourceSearchResult(input: {
  query: string
  programmeCode: string
  semesterNumber: number
  resource: {
    id: string
    title: string
    type: string
    canonicalUrl?: string | null
    url?: string | null
    provider?: string | null
    subjectId: string
    unitNumber?: number | null
    subject: { code: string; name: string }
    lessonResource?: {
      role: string
      lesson: {
        id: string
        title: string
        order: number
        unit?: { number: number; subject: { code: string } } | null
        topic?: { title: string; unit: { number: number; subject: { code: string } } } | null
      }
    } | null
  }
}): LearningSearchResult | null {
  const normalizedQuery = normalizeSearchText(input.query)
  if (normalizedQuery.length < 2) return null

  const { resource } = input
  const score = scoreMatch(normalizedQuery, [
    resource.title,
    resource.type,
    resource.provider ?? '',
    resource.canonicalUrl ?? '',
    resource.url ?? '',
    resource.subject.code,
    resource.subject.name,
    resource.lessonResource?.role ?? '',
  ])
  if (score <= 0) return null

  const linkedLesson = resource.lessonResource?.lesson
  const linkedUnit = linkedLesson?.topic?.unit ?? linkedLesson?.unit ?? null
  const subjectCode = linkedUnit?.subject.code ?? resource.subject.code
  const unitNumber = linkedUnit?.number ?? resource.unitNumber ?? undefined
  const subjectHref = `${semesterHrefFor(input.programmeCode, input.semesterNumber)}/subject/${subjectCode}`
  const href = linkedLesson
    ? `${subjectHref}/lesson/${lessonRouteSlug(linkedLesson)}`
    : `/materials?subjectId=${encodeURIComponent(resource.subjectId)}&q=${encodeURIComponent(resource.title)}`

  return {
    id: `resource:${resource.id}`,
    kind: isNotesResource(resource.type, resource.lessonResource?.role) ? 'notes' : 'resource',
    title: resource.title,
    subtitle: linkedLesson
      ? `${resource.subject.code} - ${labelForResourceRole(resource.lessonResource?.role)} - ${linkedLesson.title}`
      : `${resource.subject.code} - ${labelForResourceRole(resource.lessonResource?.role ?? resource.type)}`,
    href,
    programmeCode: input.programmeCode,
    semesterNumber: input.semesterNumber,
    subjectCode,
    unitNumber,
    lessonId: linkedLesson?.id,
    resourceId: resource.id,
    score,
  }
}

function pushLessonResult(
  results: LearningSearchResult[],
  seen: Set<string>,
  input: {
    normalizedQuery: string
    lesson: {
      id: string
      title: string
      order: number
      durationMin?: number | null
      topicId?: string | null
      unitId?: string | null
    }
    subject: { code: string; name: string }
    unitNumber: number
    topicTitle: string | null
    subjectHref: string
    programmeCode: string
    semesterNumber: number
  },
) {
  const { lesson, subject } = input
  pushResult(results, seen, {
    id: `lesson:${lesson.id}`,
    kind: 'lesson',
    title: lesson.title,
    subtitle: input.topicTitle
      ? `${subject.code} - Unit ${input.unitNumber} - ${input.topicTitle}`
      : `${subject.code} - Unit ${input.unitNumber}`,
    href: `${input.subjectHref}/lesson/${lessonRouteSlug(lesson)}`,
    programmeCode: input.programmeCode,
    semesterNumber: input.semesterNumber,
    subjectCode: subject.code,
    unitNumber: input.unitNumber,
    lessonId: lesson.id,
    score: scoreMatch(input.normalizedQuery, [
      lesson.title,
      `lesson ${lesson.order}`,
      input.topicTitle ?? '',
      subject.code,
      subject.name,
    ]),
  })
}

function pushResult(results: LearningSearchResult[], seen: Set<string>, result: LearningSearchResult) {
  if (seen.has(result.id)) return
  seen.add(result.id)
  results.push(result)
}

function semesterHrefFor(programmeCode: string, semesterNumber: number) {
  return `/learn/${programmeCode}/semester/${semesterNumber}`
}

function scoreMatch(normalizedQuery: string, values: string[]): number {
  const tokens = normalizedQuery.split(' ').filter(Boolean)
  const normalizedValues = values
    .map((value) => normalizeSearchText(value))
    .filter(Boolean)
  const haystack = normalizedValues.join(' ')
  if (tokens.length === 0 || !tokens.every((token) => haystack.includes(token))) return 0

  let score = 10
  for (const value of normalizedValues) {
    if (value === normalizedQuery) score += 80
    if (value.startsWith(normalizedQuery)) score += 45
    if (value.includes(normalizedQuery)) score += 25
    for (const token of tokens) {
      if (value === token) score += 20
      if (value.startsWith(token)) score += 12
    }
  }
  score += Math.max(0, 12 - tokens.length)
  return score
}

function normalizeSearchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isNotesResource(type: string, role: string | null | undefined): boolean {
  return ['lesson_notes', 'transcript', 'worksheet', 'formula_sheet'].includes(String(role || '')) ||
    ['pdf', 'docx', 'text', 'model_answer'].includes(type)
}

function labelForResourceRole(roleOrType: string | null | undefined): string {
  const raw = String(roleOrType || 'resource').replace(/_/g, ' ')
  return raw.slice(0, 1).toUpperCase() + raw.slice(1)
}

import 'server-only'

import { db } from '@/lib/db'
import { canonicalizeYouTubeUrl, type LessonResourceRole } from '@/lib/resources/lesson-resource-policy'
import {
  STUDENT_LESSON_RESOURCE_STATUSES,
  STUDENT_LESSON_RESOURCE_VERIFICATION_STATUSES,
  studentGeneratedDocumentWhere,
  studentLessonResourceWhere,
} from '@/lib/resources/student-publication-policy'
import {
  getStudentLearningScope,
  hasResolvedLearningScope,
  scopedLessonWhere,
} from './get-student-learning-scope'
import { selectLessonVideoResource } from './lesson-video-fallback'
import { isCanonicalLessonRouteSlug, lessonIdFromRouteSlug, lessonRouteSlug } from '../utils/lesson-slugs'

export const LESSON_MODE_KEYS = ['learn', 'simplify', 'visualise', 'practise', 'revise'] as const

export type LessonModeKey = (typeof LESSON_MODE_KEYS)[number]

const LESSON_MODE_LABELS: Record<LessonModeKey, string> = {
  learn: 'Learn',
  simplify: 'Simplify',
  visualise: 'Visualise',
  practise: 'Practise',
  revise: 'Revise',
}

export { STUDENT_LESSON_RESOURCE_STATUSES, STUDENT_LESSON_RESOURCE_VERIFICATION_STATUSES }

export interface LessonStudioResource {
  id: string
  lessonResourceId: string
  role: LessonResourceRole | string
  title: string
  type: string
  url: string | null
  embedUrl: string | null
  provider: string | null
  creator: string | null
  durationSeconds: number | null
  thumbnailUrl: string | null
  language: string
  qualityScore: number | null
  linkHealth: string
  lastMetadataCheckAt: Date | null
  isPrimary: boolean
  isRequired: boolean
  startSeconds: number | null
  endSeconds: number | null
  coveragePercentage: number | null
  chapters: Array<{
    id: string
    title: string
    startSeconds: number
    endSeconds: number | null
    transcriptSnippet: string | null
  }>
}

export interface LessonStudio {
  programme: { code: string; name: string }
  scheme: { code: string; name: string; status: string }
  semester: { number: number; name: string }
  subject: {
    id: string
    code: string
    name: string
    category: string | null
    accentColor: string
  }
  unit: {
    id: string
    number: number
    title: string
    description: string | null
    weightage: number
    outcomes: string | null
  }
  topic: {
    id: string
    slug: string
    title: string
    description: string | null
    difficulty: string
    examWeightage: number
    outcomes: string | null
  } | null
  lesson: {
    id: string
    slug: string
    title: string
    order: number
    durationMin: number
    status: string
    version: number
    publishedAt: Date | null
    citations: string | null
    aiGenerated: boolean
    sourceCompleteness: string | null
    modeContent: Record<LessonModeKey, string | null>
    modes: Array<{
      key: LessonModeKey
      label: string
      available: boolean
      completed: boolean
      progress: number
      scrollPos: number
      completedAt: Date | null
    }>
  }
  canonicalPath: string
  needsCanonicalRedirect: boolean
  navigation: {
    previousLesson: { title: string; href: string } | null
    nextLesson: { title: string; href: string } | null
    units: Array<{
      id: string
      number: number
      title: string
      lessons: Array<{
        id: string
        title: string
        order: number
        durationMin: number
        href: string
        isActive: boolean
        topicTitle: string | null
      }>
    }>
  }
  resources: {
    primaryVideo: LessonStudioResource | null
    primaryVideoFallbackReason: string | null
    alternateVideos: LessonStudioResource[]
    notes: LessonStudioResource[]
    supporting: LessonStudioResource[]
  }
  generatedDocuments: Array<{
    id: string
    documentType: string
    version: number
    pageCount: number | null
    publishedAt: Date | null
    storageObjectKey: string | null
    htmlObjectKey: string | null
    outputResource: {
      id: string
      title: string
      type: string
      url: string | null
    } | null
  }>
  completion: {
    completedModeCount: number
    totalModeCount: number
    percent: number
    minimumVideoPercent: number
    requirePractice: boolean
    requireQuizPass: boolean
    requireExplicitDone: boolean
  }
  videoProgress: Array<{
    resourceId: string
    lastSecond: number
    watchedSeconds: number
    watchPercent: number
    completedAt: Date | null
  }>
}

export async function getLessonStudio(
  userId: string,
  input: {
    programmeCode: string
    semesterNumber: number
    subjectCode: string
    lessonSlug: string
  },
): Promise<LessonStudio | null> {
  const scope = await getStudentLearningScope(userId)
  if (!hasResolvedLearningScope(scope)) return null
  if (scope.programme.code.toUpperCase() !== input.programmeCode.trim().toUpperCase()) return null
  if (scope.semester.number !== input.semesterNumber) return null

  const subject = scope.subjects.find(
    (item) => item.code.toUpperCase() === input.subjectCode.trim().toUpperCase(),
  )
  if (!subject) return null

  const lessonId = lessonIdFromRouteSlug(input.lessonSlug)
  if (!lessonId) return null

  const lesson = await db.lesson.findFirst({
    where: {
      id: lessonId,
      AND: [
        scopedLessonWhere(scope),
        {
          OR: [
            { unit: { subjectId: subject.id } },
            { topic: { unit: { subjectId: subject.id } } },
          ],
        },
      ],
    },
    include: {
      unit: {
        select: {
          id: true,
          number: true,
          title: true,
          description: true,
          weightage: true,
          outcomes: true,
        },
      },
      topic: {
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          difficulty: true,
          examWeightage: true,
          outcomes: true,
          unit: {
            select: {
              id: true,
              number: true,
              title: true,
              description: true,
              weightage: true,
              outcomes: true,
            },
          },
        },
      },
      completions: {
        where: { userId },
        select: { mode: true, progress: true, scrollPos: true, completedAt: true },
      },
      resources: {
        where: studentLessonResourceWhere(),
        orderBy: [{ role: 'asc' }, { isPrimary: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          role: true,
          sortOrder: true,
          isPrimary: true,
          isRequired: true,
          startSeconds: true,
          endSeconds: true,
          coveragePercentage: true,
          resource: {
            select: {
              id: true,
              title: true,
              type: true,
              url: true,
              canonicalUrl: true,
              provider: true,
              externalId: true,
              thumbnailUrl: true,
              durationSeconds: true,
              language: true,
              creator: true,
              qualityScore: true,
              linkHealth: true,
              lastMetadataCheckAt: true,
              videoChapters: {
                where: {
                  status: { in: [...STUDENT_LESSON_RESOURCE_STATUSES] },
                  verificationStatus: { in: [...STUDENT_LESSON_RESOURCE_VERIFICATION_STATUSES] },
                },
                orderBy: [{ order: 'asc' }, { startSeconds: 'asc' }],
                select: {
                  id: true,
                  title: true,
                  startSeconds: true,
                  endSeconds: true,
                  transcriptSnippet: true,
                },
              },
            },
          },
        },
      },
      generatedDocuments: {
        where: studentGeneratedDocumentWhere(),
        orderBy: [{ documentType: 'asc' }, { version: 'desc' }],
        select: {
          id: true,
          documentType: true,
          version: true,
          pageCount: true,
          publishedAt: true,
          storageObjectKey: true,
          htmlObjectKey: true,
          outputResource: {
            select: {
              id: true,
              title: true,
              type: true,
              url: true,
            },
          },
        },
      },
      completionCriteria: {
        select: {
          minimumVideoPercent: true,
          requirePractice: true,
          requireQuizPass: true,
          requireExplicitDone: true,
        },
      },
      videoWatchProgress: {
        where: { userId },
        select: {
          resourceId: true,
          lastSecond: true,
          watchedSeconds: true,
          watchPercent: true,
          completedAt: true,
        },
      },
    },
  })

  if (!lesson) return null

  const unit = lesson.topic?.unit ?? lesson.unit
  if (!unit) return null

  const slug = lessonRouteSlug(lesson)
  const canonicalPath = `/learn/${scope.programme.code}/semester/${scope.semester.number}/subject/${subject.code}/lesson/${slug}`
  const resources = lesson.resources.map(mapLessonResource)
  const videoSelection = selectLessonVideoResource(resources)

  const completionByMode = new Map(lesson.completions.map((completion) => [completion.mode, completion]))
  const modes = LESSON_MODE_KEYS.map((key) => {
    const completion = completionByMode.get(key)
    const content = modeContentForLesson(lesson, key)
    return {
      key,
      label: LESSON_MODE_LABELS[key],
      available: Boolean(content?.trim()),
      completed: Boolean(completion?.completedAt),
      progress: completion?.progress ?? 0,
      scrollPos: completion?.scrollPos ?? 0,
      completedAt: completion?.completedAt ?? null,
    }
  })
  const completedModeCount = modes.filter((mode) => mode.completed).length

  return {
    programme: scope.programme,
    scheme: scope.scheme,
    semester: { number: scope.semester.number, name: scope.semester.name },
    subject: {
      id: subject.id,
      code: subject.code,
      name: subject.name,
      category: subject.category,
      accentColor: subject.accentColor,
    },
    unit,
    topic: lesson.topic
      ? {
          id: lesson.topic.id,
          slug: lesson.topic.slug,
          title: lesson.topic.title,
          description: lesson.topic.description,
          difficulty: lesson.topic.difficulty,
          examWeightage: lesson.topic.examWeightage,
          outcomes: lesson.topic.outcomes,
        }
      : null,
    lesson: {
      id: lesson.id,
      slug,
      title: lesson.title,
      order: lesson.order,
      durationMin: lesson.durationMin,
      status: lesson.status,
      version: lesson.version,
      publishedAt: lesson.publishedAt,
      citations: lesson.citations,
      aiGenerated: lesson.aiGenerated,
      sourceCompleteness: lesson.sourceCompleteness,
      modeContent: {
        learn: lesson.learnContent,
        simplify: lesson.simplifyContent,
        visualise: lesson.visualiseContent,
        practise: lesson.practiseContent,
        revise: lesson.reviseContent,
      },
      modes,
    },
    canonicalPath,
    needsCanonicalRedirect: !isCanonicalLessonRouteSlug(lesson, input.lessonSlug),
    navigation: buildNavigation({
      subject,
      programmeCode: scope.programme.code,
      semesterNumber: scope.semester.number,
      currentLessonId: lesson.id,
    }),
    resources: {
      primaryVideo: videoSelection.primaryVideo,
      primaryVideoFallbackReason: videoSelection.fallbackReason,
      alternateVideos: videoSelection.alternateVideos,
      notes: resources.filter((resource) =>
        ['lesson_notes', 'transcript', 'worksheet', 'formula_sheet'].includes(resource.role),
      ),
      supporting: resources.filter((resource) =>
        ['infographic', 'lab_demo', 'reference'].includes(resource.role),
      ),
    },
    generatedDocuments: lesson.generatedDocuments,
    completion: {
      completedModeCount,
      totalModeCount: LESSON_MODE_KEYS.length,
      percent: Math.round((completedModeCount / LESSON_MODE_KEYS.length) * 100),
      minimumVideoPercent: lesson.completionCriteria?.minimumVideoPercent ?? 0,
      requirePractice: lesson.completionCriteria?.requirePractice ?? false,
      requireQuizPass: lesson.completionCriteria?.requireQuizPass ?? false,
      requireExplicitDone: lesson.completionCriteria?.requireExplicitDone ?? true,
    },
    videoProgress: lesson.videoWatchProgress,
  }
}

function modeContentForLesson(
  lesson: {
    learnContent: string | null
    simplifyContent: string | null
    visualiseContent: string | null
    practiseContent: string | null
    reviseContent: string | null
  },
  mode: LessonModeKey,
) {
  switch (mode) {
    case 'learn':
      return lesson.learnContent
    case 'simplify':
      return lesson.simplifyContent
    case 'visualise':
      return lesson.visualiseContent
    case 'practise':
      return lesson.practiseContent
    case 'revise':
      return lesson.reviseContent
  }
}

function buildNavigation(input: {
  subject: NonNullable<Awaited<ReturnType<typeof getStudentLearningScope>>>['subjects'][number]
  programmeCode: string
  semesterNumber: number
  currentLessonId: string
}): LessonStudio['navigation'] {
  const flatLessons: Array<{
    id: string
    title: string
    order: number
    durationMin: number
    unitNumber: number
    href: string
    isActive: boolean
    topicTitle: string | null
  }> = []

  const units = input.subject.units.map((unit) => {
    const topicTitles = new Map(unit.topics.map((topic) => [topic.id, topic.title]))
    const lessons = new Map<string, {
      id: string
      title: string
      order: number
      durationMin: number
      topicTitle: string | null
    }>()

    for (const topic of unit.topics) {
      for (const lesson of topic.lessons ?? []) {
        lessons.set(lesson.id, {
          id: lesson.id,
          title: lesson.title,
          order: lesson.order,
          durationMin: lesson.durationMin,
          topicTitle: topic.title,
        })
      }
    }

    for (const lesson of unit.lessons) {
      if (lessons.has(lesson.id)) continue
      lessons.set(lesson.id, {
        id: lesson.id,
        title: lesson.title,
        order: lesson.order,
        durationMin: lesson.durationMin,
        topicTitle: lesson.topicId ? topicTitles.get(lesson.topicId) ?? null : null,
      })
    }

    const unitLessons = Array.from(lessons.values())
      .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
      .map((lesson) => {
        const href = `/learn/${input.programmeCode}/semester/${input.semesterNumber}/subject/${input.subject.code}/lesson/${lessonRouteSlug(lesson)}`
        const item = {
          ...lesson,
          href,
          isActive: lesson.id === input.currentLessonId,
        }
        flatLessons.push({ ...item, unitNumber: unit.number })
        return item
      })

    return {
      id: unit.id,
      number: unit.number,
      title: unit.title,
      lessons: unitLessons,
    }
  })

  flatLessons.sort((a, b) => a.unitNumber - b.unitNumber || a.order - b.order || a.title.localeCompare(b.title))
  const currentIndex = flatLessons.findIndex((lesson) => lesson.id === input.currentLessonId)
  const previous = currentIndex > 0 ? flatLessons[currentIndex - 1] : null
  const next = currentIndex >= 0 && currentIndex < flatLessons.length - 1 ? flatLessons[currentIndex + 1] : null

  return {
    previousLesson: previous ? { title: previous.title, href: previous.href } : null,
    nextLesson: next ? { title: next.title, href: next.href } : null,
    units,
  }
}

function mapLessonResource(item: {
  id: string
  role: string
  isPrimary: boolean
  isRequired: boolean
  startSeconds: number | null
  endSeconds: number | null
  coveragePercentage: number | null
  resource: {
    id: string
    title: string
    type: string
    url: string | null
    canonicalUrl: string | null
    provider: string | null
    externalId: string | null
    thumbnailUrl: string | null
    durationSeconds: number | null
    language: string
    creator: string | null
    qualityScore: number | null
    linkHealth: string
    lastMetadataCheckAt: Date | null
    videoChapters: Array<{
      id: string
      title: string
      startSeconds: number
      endSeconds: number | null
      transcriptSnippet: string | null
    }>
  }
}): LessonStudioResource {
  const url =
    item.resource.canonicalUrl ??
    item.resource.url ??
    youtubeUrlFromProviderId(item.resource.provider, item.resource.externalId)
  const youtube = url ? canonicalizeYouTubeUrl(url) : null
  const embedUrl = youtube?.kind === 'video' && youtube.videoId
    ? `https://www.youtube-nocookie.com/embed/${youtube.videoId}`
    : null

  return {
    id: item.resource.id,
    lessonResourceId: item.id,
    role: item.role,
    title: item.resource.title,
    type: item.resource.type,
    url,
    embedUrl,
    provider: item.resource.provider,
    creator: item.resource.creator,
    durationSeconds: item.resource.durationSeconds,
    thumbnailUrl: item.resource.thumbnailUrl,
    language: item.resource.language,
    qualityScore: item.resource.qualityScore,
    linkHealth: item.resource.linkHealth,
    lastMetadataCheckAt: item.resource.lastMetadataCheckAt,
    isPrimary: item.isPrimary,
    isRequired: item.isRequired,
    startSeconds: item.startSeconds,
    endSeconds: item.endSeconds,
    coveragePercentage: item.coveragePercentage,
    chapters: item.resource.videoChapters,
  }
}

function youtubeUrlFromProviderId(provider: string | null, externalId: string | null): string | null {
  if (!externalId || !provider?.toLowerCase().includes('youtube')) return null
  return `https://www.youtube.com/watch?v=${externalId}`
}

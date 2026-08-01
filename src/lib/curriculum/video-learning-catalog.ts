import 'server-only'

import type { ManifestSubject } from '@/lib/curriculum/manifest-data'
import { enhanceSubject } from '@/lib/curriculum/enhanced-manifest'
import { getSubjectNotes, type Lesson } from '@/lib/curriculum/lesson-notes-loader'
import {
  buildManifestLessonVideoAssignments,
  type LessonVideoSelection,
} from '@/lib/curriculum/lesson-video-resolver'

export interface VideoLearningTopic {
  slug: string
  title: string
  overview: string
  durationMin: number
  difficulty: string
  objectives: string[]
  keyConcepts: string[]
  unitNumber: number
  unitTitle: string
  unitWeightage: number
  lesson: Lesson
  video: LessonVideoSelection | null
}

export interface VideoLearningUnit {
  number: number
  title: string
  weightage: number
  topics: VideoLearningTopic[]
}

export interface VideoLearningCatalog {
  resolvedSubjectCode: string
  units: VideoLearningUnit[]
  topics: VideoLearningTopic[]
  videoLessons: VideoLearningTopic[]
  pendingTopics: VideoLearningTopic[]
  notesReady: boolean
}

/**
 * Builds the single source of truth used by the Learn video experience.
 * Notes provide the official topic order and learning objectives, but a topic
 * becomes a Learn "lesson" only when it has one reviewed/direct video.
 * Detailed written content remains in Materials.
 */
export function buildVideoLearningCatalog(
  programmeCode: string,
  subject: ManifestSubject,
): VideoLearningCatalog {
  const resolvedSubjectCode = programmeCode === 'DCIOT' && subject.alternateCode
    ? subject.alternateCode
    : subject.code
  const notes = getSubjectNotes(resolvedSubjectCode) ?? getSubjectNotes(subject.code)
  const enhanced = enhanceSubject(subject)

  const sourceUnits = notes
    ? notes.units.map((unit) => ({
        number: unit.number,
        title: unit.title,
        weightage: unit.weightage,
        lessons: unit.lessons,
      }))
    : enhanced.units.map((unit) => ({
        number: unit.number,
        title: unit.title,
        weightage: unit.weightage,
        lessons: unit.lessons.map((lesson) => toSyntheticLesson(lesson)),
      }))

  const resolverLessons = sourceUnits.flatMap((unit) => unit.lessons)
  const assignments = buildManifestLessonVideoAssignments(subject, resolverLessons)
  const units: VideoLearningUnit[] = sourceUnits.map((unit) => ({
    number: unit.number,
    title: unit.title,
    weightage: unit.weightage,
    topics: unit.lessons.map((lesson) => ({
      slug: lesson.slug,
      title: lesson.title,
      overview: lesson.overview,
      durationMin: lesson.durationMin,
      difficulty: lesson.difficulty,
      objectives: lesson.objectives ?? lesson.keyConcepts,
      keyConcepts: lesson.keyConcepts,
      unitNumber: unit.number,
      unitTitle: unit.title,
      unitWeightage: unit.weightage,
      lesson,
      video: assignments.get(lesson.slug) ?? null,
    })),
  }))
  const topics = units.flatMap((unit) => unit.topics)

  return {
    resolvedSubjectCode,
    units,
    topics,
    videoLessons: topics.filter((topic) => Boolean(topic.video)),
    pendingTopics: topics.filter((topic) => !topic.video),
    notesReady: Boolean(notes),
  }
}

function toSyntheticLesson(lesson: ReturnType<typeof enhanceSubject>['units'][number]['lessons'][number]): Lesson {
  return {
    slug: lesson.slug,
    title: lesson.title,
    durationMin: lesson.durationMin,
    difficulty: lesson.difficulty,
    overview: lesson.description,
    keyConcepts: lesson.outcomes,
    formulas: [],
    tables: [],
    diagrams: [],
    codeExamples: [],
    commonMistakes: [],
    examTips: [],
    practiceQuestions: [],
    objectives: lesson.outcomes,
    prerequisites: [],
  }
}

export const BOARDS = ['CBSE'] as const
export const CLASS_LEVELS = ['11', '12', 'DROPPER'] as const
export const STREAMS = ['PCM', 'PCB', 'PCMB', 'COMMERCE', 'HUMANITIES'] as const
export const TARGET_EXAMS = ['BOARDS', 'JEE_MAIN', 'JEE_ADVANCED'] as const

export type Board = (typeof BOARDS)[number]
export type ClassLevel = (typeof CLASS_LEVELS)[number]
export type Stream = (typeof STREAMS)[number]
export type TargetExam = (typeof TARGET_EXAMS)[number]

export type SubjectSlug =
  | 'physics'
  | 'chemistry'
  | 'mathematics'
  | 'biology'
  | 'english'
  | 'computer-science'
  | 'physical-education'

export interface StudentAcademicProfile {
  id: string
  userId: string
  board: Board
  classLevel: ClassLevel
  stream: Stream
  targetExams: TargetExam[]
  targetYear: number
  subjects: SubjectSlug[]
  dailyStudyGoal: number
  preferredLearningStyle: string | null
  strongSubjects: SubjectSlug[]
  weakSubjects: SubjectSlug[]
  createdAt: Date
  updatedAt: Date
}

export interface AcademicChapter {
  id: string
  slug: string
  name: string
  order: number
  description?: string
  topics: AcademicTopic[]
  examTags: TargetExam[]
}

export interface AcademicTopic {
  id: string
  slug: string
  name: string
  order: number
}

export interface AcademicSubject {
  id: string
  slug: SubjectSlug
  name: string
  shortName: string
  classLevel: '11' | '12'
  board: Board
  streamTags: Stream[]
  chapters: AcademicChapter[]
}

export function isJeeProfile(profile: Pick<StudentAcademicProfile, 'stream' | 'targetExams'>) {
  return (
    ['PCM', 'PCMB'].includes(profile.stream) &&
    profile.targetExams.some((exam) => exam === 'JEE_MAIN' || exam === 'JEE_ADVANCED')
  )
}

export function defaultSubjectsForStream(stream: Stream): SubjectSlug[] {
  switch (stream) {
    case 'PCM':
      return ['physics', 'chemistry', 'mathematics', 'english']
    case 'PCB':
      return ['physics', 'chemistry', 'biology', 'english']
    case 'PCMB':
      return ['physics', 'chemistry', 'mathematics', 'biology', 'english']
    case 'COMMERCE':
    case 'HUMANITIES':
      return ['english']
  }
}


import type { Prisma } from '@prisma/client'
import { db as defaultDb } from '@/lib/db'
import {
  TARGET_CWIT_DEPARTMENT_CODES,
  TARGET_CWIT_PROGRAMME_CODES,
  type TargetCwitProgrammeCode,
} from '@/lib/cwit-departments'
import {
  PUBLISHED_LESSON_STATUSES,
  STUDENT_LESSON_RESOURCE_STATUSES,
  STUDENT_LESSON_RESOURCE_VERIFICATION_STATUSES,
  STUDENT_STRUCTURE_REVIEW_STATUSES,
  STUDENT_SUBJECT_REVIEW_STATUSES,
  studentGeneratedDocumentWhere,
  studentLessonResourceWhere,
  studentVisibleQuestionWhere,
  studentVisibleResourceWhere,
  studentVisibleSchemeWhere,
  studentVisibleSubjectWhere,
  studentVisibleTopicWhere,
  studentVisibleUnitWhere,
} from '@/lib/resources/student-publication-policy'

export interface DatabaseLearningCoverageSnapshot {
  generatedAt: string
  schemeCode: string
  sourceNote: string
  totals: DatabaseCoverageTotals
  programmes: DatabaseProgrammeCoverage[]
}

export interface DatabaseCoverageTotals {
  programmes: number
  semesters: number
  publishedSchemes: number
  subjects: number
  units: number
  topics: number
  lessons: number
  lessonsWithPrimaryVideo: number
  lessonsWithApprovedHtmlNotes: number
  lessonsWithApprovedPdf: number
  lessonsWithPractice: number
  approvedLessonResources: number
  approvedGeneratedDocuments: number
  publishedResources: number
  brokenResources: number
  publishedQuestions: number
  publishedPracticalExperiments: number
  publishedCodingChallenges: number
  pendingReviewItems: number
}

export interface DatabaseProgrammeCoverage {
  programme: string
  department: string
  schemeId: string | null
  schemeStatus: string | null
  semesters: DatabaseSemesterCoverage[]
}

export type DatabaseSemesterCoverageStatus =
  | 'published_scheme_present'
  | 'missing_published_scheme'
  | 'missing_semester'

export interface DatabaseSemesterCoverage {
  programme: string
  department: string
  semester: number
  status: DatabaseSemesterCoverageStatus
  schemeId: string | null
  semesterId: string | null
  subjects: number
  units: number
  topics: number
  lessons: number
  lessonsWithPrimaryVideo: number
  lessonsWithApprovedHtmlNotes: number
  lessonsWithApprovedPdf: number
  lessonsWithPractice: number
  approvedLessonResources: number
  approvedGeneratedDocuments: number
  publishedResources: number
  brokenResources: number
  publishedQuestions: number
  publishedPracticalExperiments: number
  publishedCodingChallenges: number
  pendingReviewItems: number
  subjectCodes: string[]
  notes: string[]
}

export interface DatabaseCoverageClient {
  academicScheme: {
    findMany(args: Prisma.AcademicSchemeFindManyArgs): Promise<DatabaseSchemeRow[]>
  }
  subject: {
    findMany(args: Prisma.SubjectFindManyArgs): Promise<DatabaseSubjectCodeRow[]>
    count(args: Prisma.SubjectCountArgs): Promise<number>
  }
  unit: {
    count(args: Prisma.UnitCountArgs): Promise<number>
  }
  topic: {
    count(args: Prisma.TopicCountArgs): Promise<number>
  }
  lesson: {
    count(args: Prisma.LessonCountArgs): Promise<number>
  }
  lessonResource: {
    count(args: Prisma.LessonResourceCountArgs): Promise<number>
  }
  generatedLessonDocument: {
    count(args: Prisma.GeneratedLessonDocumentCountArgs): Promise<number>
  }
  question: {
    count(args: Prisma.QuestionCountArgs): Promise<number>
  }
  resource: {
    count(args: Prisma.ResourceCountArgs): Promise<number>
  }
  practicalExperiment: {
    count(args: Prisma.PracticalExperimentCountArgs): Promise<number>
  }
  codingChallenge: {
    count(args: Prisma.CodingChallengeCountArgs): Promise<number>
  }
  contentGenerationJob: {
    count(args: Prisma.ContentGenerationJobCountArgs): Promise<number>
  }
}

const TARGETS = [
  { programme: 'DCOMP', department: 'COMP' },
  { programme: 'DCIOT', department: 'CIOT' },
] as const

const databaseSchemeSelect = {
  id: true,
  code: true,
  name: true,
  status: true,
  programme: {
    select: {
      id: true,
      code: true,
      department: { select: { code: true } },
    },
  },
  semesters: {
    where: { number: { gte: 1, lte: 6 } },
    orderBy: { number: 'asc' },
    select: { id: true, number: true, name: true },
  },
} satisfies Prisma.AcademicSchemeSelect

const subjectCodeSelect = {
  code: true,
} satisfies Prisma.SubjectSelect

type DatabaseSchemeRow = Prisma.AcademicSchemeGetPayload<{ select: typeof databaseSchemeSelect }>
type DatabaseSubjectCodeRow = Prisma.SubjectGetPayload<{ select: typeof subjectCodeSelect }>

const PENDING_GENERATED_DOCUMENT_STATUSES = ['draft', 'generating', 'validation_failed', 'ready_for_review', 'failed']
const PENDING_CONTENT_JOB_STATES = ['queued', 'running', 'validation_failed', 'awaiting_review', 'failed']

export async function buildDatabaseLearningCoverageSnapshot(input: {
  db?: DatabaseCoverageClient
  generatedAt?: string
  schemeCode?: string
} = {}): Promise<DatabaseLearningCoverageSnapshot> {
  const client = input.db ?? (defaultDb as unknown as DatabaseCoverageClient)
  const schemeCode = input.schemeCode ?? 'R23'
  const schemes = await client.academicScheme.findMany({
    where: {
      code: schemeCode,
      ...studentVisibleSchemeWhere(),
      programme: {
        code: { in: [...TARGET_CWIT_PROGRAMME_CODES] },
        status: 'active',
        archivedAt: null,
        department: {
          code: { in: [...TARGET_CWIT_DEPARTMENT_CODES] },
          status: 'active',
          archivedAt: null,
        },
      },
    },
    orderBy: [{ startYear: 'desc' }, { createdAt: 'desc' }],
    select: databaseSchemeSelect,
  })

  const latestSchemeByProgramme = latestSchemeMap(schemes)
  const programmes = await Promise.all(
    TARGETS.map(async (target) => {
      const scheme = latestSchemeByProgramme.get(target.programme) ?? null
      return {
        programme: target.programme,
        department: target.department,
        schemeId: scheme?.id ?? null,
        schemeStatus: scheme?.status ?? null,
        semesters: await Promise.all(
          Array.from({ length: 6 }, (_, index) =>
            buildDatabaseSemesterCoverage(client, target, scheme, index + 1),
          ),
        ),
      }
    }),
  )

  return {
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    schemeCode,
    sourceNote:
      'Database coverage is calculated from rows that satisfy student publication predicates. Pending review counts include draft, unpublished, failed, and review-ready rows in the same programme-semester scope.',
    totals: totalsForProgrammes(programmes),
    programmes,
  }
}

function latestSchemeMap(schemes: readonly DatabaseSchemeRow[]) {
  const map = new Map<TargetCwitProgrammeCode, DatabaseSchemeRow>()
  for (const scheme of schemes) {
    const programmeCode = scheme.programme?.code
    if (
      TARGET_CWIT_PROGRAMME_CODES.includes(programmeCode as TargetCwitProgrammeCode) &&
      !map.has(programmeCode as TargetCwitProgrammeCode)
    ) {
      map.set(programmeCode as TargetCwitProgrammeCode, scheme)
    }
  }
  return map
}

async function buildDatabaseSemesterCoverage(
  client: DatabaseCoverageClient,
  target: (typeof TARGETS)[number],
  scheme: DatabaseSchemeRow | null,
  semesterNumber: number,
): Promise<DatabaseSemesterCoverage> {
  if (!scheme) {
    return emptyDatabaseSemesterCoverage(target, semesterNumber, 'missing_published_scheme', [
      'No published R23 academic scheme is available for this target programme.',
    ])
  }

  const semester = scheme.semesters.find((item) => item.number === semesterNumber)
  if (!semester) {
    return emptyDatabaseSemesterCoverage(target, semesterNumber, 'missing_semester', [
      'Published R23 scheme exists, but this semester row is missing in the database.',
    ], scheme.id)
  }

  const baseSubjectWhere: Prisma.SubjectWhereInput = {
    schemeId: scheme.id,
    semesterId: semester.id,
    archivedAt: null,
  }
  const subjectWhere: Prisma.SubjectWhereInput = {
    ...baseSubjectWhere,
    ...studentVisibleSubjectWhere(),
  }
  const unitWhere: Prisma.UnitWhereInput = {
    ...studentVisibleUnitWhere(),
    subject: subjectWhere,
  }
  const topicWhere: Prisma.TopicWhereInput = {
    ...studentVisibleTopicWhere(),
    unit: unitWhere,
  }
  const lessonWhere = publishedLessonWhere(subjectWhere)
  const pendingLessonScopeWhere = lessonScopeWhere(baseSubjectWhere)

  const [
    subjectRows,
    subjects,
    units,
    topics,
    lessons,
    lessonsWithPrimaryVideo,
    lessonsWithApprovedHtmlNotes,
    lessonsWithApprovedPdf,
    lessonsWithPractice,
    approvedLessonResources,
    approvedGeneratedDocuments,
    publishedResources,
    brokenResources,
    publishedQuestions,
    publishedPracticalExperiments,
    publishedCodingChallenges,
    pendingSubjects,
    pendingUnits,
    pendingTopics,
    pendingLessons,
    pendingLessonResources,
    pendingGeneratedDocuments,
    pendingGenerationJobs,
  ] = await Promise.all([
    client.subject.findMany({
      where: subjectWhere,
      orderBy: [{ displayOrder: 'asc' }, { code: 'asc' }],
      select: subjectCodeSelect,
    }),
    client.subject.count({ where: subjectWhere }),
    client.unit.count({ where: unitWhere }),
    client.topic.count({ where: topicWhere }),
    client.lesson.count({ where: lessonWhere }),
    client.lesson.count({
      where: {
        AND: [
          lessonWhere,
          {
            resources: {
              some: {
                role: 'primary_video',
                isPrimary: true,
                ...studentLessonResourceWhere(),
              },
            },
          },
        ],
      },
    }),
    client.lesson.count({
      where: {
        AND: [
          lessonWhere,
          {
            generatedDocuments: {
              some: {
                documentType: 'lesson_notes',
                htmlObjectKey: { not: null },
                ...studentGeneratedDocumentWhere(),
              },
            },
          },
        ],
      },
    }),
    client.lesson.count({
      where: {
        AND: [
          lessonWhere,
          {
            generatedDocuments: {
              some: {
                documentType: 'lesson_notes',
                storageObjectKey: { not: null },
                ...studentGeneratedDocumentWhere(),
              },
            },
          },
        ],
      },
    }),
    client.lesson.count({
      where: {
        AND: [
          lessonWhere,
          {
            OR: [
              { topic: { questions: { some: studentVisibleQuestionWhere() } } },
              { questionAttempts: { some: { question: studentVisibleQuestionWhere() } } },
            ],
          },
        ],
      },
    }),
    client.lessonResource.count({
      where: {
        lesson: lessonWhere,
        ...studentLessonResourceWhere(),
      },
    }),
    client.generatedLessonDocument.count({
      where: {
        lesson: lessonWhere,
        ...studentGeneratedDocumentWhere(),
      },
    }),
    client.resource.count({
      where: {
        ...studentVisibleResourceWhere(),
        subject: subjectWhere,
      },
    }),
    client.resource.count({
      where: {
        ...studentVisibleResourceWhere(),
        subject: subjectWhere,
        linkHealth: { in: ['stale', 'unhealthy'] },
      },
    }),
    client.question.count({
      where: {
        ...studentVisibleQuestionWhere(),
        subject: subjectWhere,
      },
    }),
    client.practicalExperiment.count({
      where: {
        subject: subjectWhere,
        status: { in: ['active', 'published', 'verified'] },
      },
    }),
    client.codingChallenge.count({
      where: {
        status: 'published',
        OR: [
          { subject: subjectWhere },
          { unit: { subject: subjectWhere } },
          { topic: { unit: { subject: subjectWhere } } },
          { lesson: lessonWhere },
        ],
      },
    }),
    client.subject.count({
      where: {
        ...baseSubjectWhere,
        OR: [
          { status: { not: 'active' } },
          { reviewStatus: { notIn: [...STUDENT_SUBJECT_REVIEW_STATUSES] } },
        ],
      },
    }),
    client.unit.count({
      where: {
        subject: baseSubjectWhere,
        archivedAt: null,
        OR: [
          { status: { not: 'active' } },
          { reviewStatus: { notIn: [...STUDENT_STRUCTURE_REVIEW_STATUSES] } },
          { publishedAt: null },
        ],
      },
    }),
    client.topic.count({
      where: {
        unit: { subject: baseSubjectWhere },
        archivedAt: null,
        OR: [
          { status: { not: 'active' } },
          { reviewStatus: { notIn: [...STUDENT_STRUCTURE_REVIEW_STATUSES] } },
          { publishedAt: null },
        ],
      },
    }),
    client.lesson.count({
      where: {
        ...pendingLessonScopeWhere,
        status: { notIn: [...PUBLISHED_LESSON_STATUSES] },
      },
    }),
    client.lessonResource.count({
      where: {
        lesson: pendingLessonScopeWhere,
        OR: [
          { status: { notIn: [...STUDENT_LESSON_RESOURCE_STATUSES] } },
          { verificationStatus: { notIn: [...STUDENT_LESSON_RESOURCE_VERIFICATION_STATUSES] } },
        ],
      },
    }),
    client.generatedLessonDocument.count({
      where: {
        lesson: pendingLessonScopeWhere,
        generationStatus: { in: PENDING_GENERATED_DOCUMENT_STATUSES },
      },
    }),
    client.contentGenerationJob.count({
      where: {
        lesson: pendingLessonScopeWhere,
        state: { in: PENDING_CONTENT_JOB_STATES },
      },
    }),
  ])

  return {
    programme: target.programme,
    department: target.department,
    semester: semesterNumber,
    status: 'published_scheme_present',
    schemeId: scheme.id,
    semesterId: semester.id,
    subjects,
    units,
    topics,
    lessons,
    lessonsWithPrimaryVideo,
    lessonsWithApprovedHtmlNotes,
    lessonsWithApprovedPdf,
    lessonsWithPractice,
    approvedLessonResources,
    approvedGeneratedDocuments,
    publishedResources,
    brokenResources,
    publishedQuestions,
    publishedPracticalExperiments,
    publishedCodingChallenges,
    pendingReviewItems:
      pendingSubjects +
      pendingUnits +
      pendingTopics +
      pendingLessons +
      pendingLessonResources +
      pendingGeneratedDocuments +
      pendingGenerationJobs,
    subjectCodes: subjectRows.map((subject) => subject.code).sort((a, b) => a.localeCompare(b)),
    notes: databaseNotes({
      subjects,
      units,
      lessons,
      lessonsWithPrimaryVideo,
      lessonsWithApprovedPdf,
      lessonsWithPractice,
      pendingReviewItems:
        pendingSubjects +
        pendingUnits +
        pendingTopics +
        pendingLessons +
        pendingLessonResources +
        pendingGeneratedDocuments +
        pendingGenerationJobs,
    }),
  }
}

function publishedLessonWhere(subjectWhere: Prisma.SubjectWhereInput): Prisma.LessonWhereInput {
  return {
    status: { in: [...PUBLISHED_LESSON_STATUSES] },
    archivedAt: null,
    OR: [
      {
        unit: {
          ...studentVisibleUnitWhere(),
          subject: subjectWhere,
        },
      },
      {
        topic: {
          ...studentVisibleTopicWhere(),
          unit: {
            ...studentVisibleUnitWhere(),
            subject: subjectWhere,
          },
        },
      },
    ],
  }
}

function lessonScopeWhere(subjectWhere: Prisma.SubjectWhereInput): Prisma.LessonWhereInput {
  return {
    archivedAt: null,
    OR: [
      { unit: { subject: subjectWhere } },
      { topic: { unit: { subject: subjectWhere } } },
    ],
  }
}

function emptyDatabaseSemesterCoverage(
  target: (typeof TARGETS)[number],
  semester: number,
  status: DatabaseSemesterCoverageStatus,
  notes: string[],
  schemeId: string | null = null,
): DatabaseSemesterCoverage {
  return {
    programme: target.programme,
    department: target.department,
    semester,
    status,
    schemeId,
    semesterId: null,
    subjects: 0,
    units: 0,
    topics: 0,
    lessons: 0,
    lessonsWithPrimaryVideo: 0,
    lessonsWithApprovedHtmlNotes: 0,
    lessonsWithApprovedPdf: 0,
    lessonsWithPractice: 0,
    approvedLessonResources: 0,
    approvedGeneratedDocuments: 0,
    publishedResources: 0,
    brokenResources: 0,
    publishedQuestions: 0,
    publishedPracticalExperiments: 0,
    publishedCodingChallenges: 0,
    pendingReviewItems: 1,
    subjectCodes: [],
    notes,
  }
}

function databaseNotes(input: {
  subjects: number
  units: number
  lessons: number
  lessonsWithPrimaryVideo: number
  lessonsWithApprovedPdf: number
  lessonsWithPractice: number
  pendingReviewItems: number
}): string[] {
  const notes: string[] = []
  if (input.subjects === 0) notes.push('No student-visible subjects are published for this semester.')
  if (input.subjects > 0 && input.units === 0) notes.push('Published subjects exist, but no student-visible units are published.')
  if (input.units > 0 && input.lessons === 0) notes.push('Published structure exists, but no student-visible lessons are published.')
  if (input.lessons > 0 && input.lessonsWithPrimaryVideo === 0) notes.push('Published lessons do not have approved primary-video mappings yet.')
  if (input.lessons > 0 && input.lessonsWithApprovedPdf === 0) notes.push('Published lessons do not have approved PDF note artifacts yet.')
  if (input.lessons > 0 && input.lessonsWithPractice === 0) notes.push('Published lessons do not have lesson-scoped practice evidence yet.')
  if (input.pendingReviewItems > 0) notes.push('Draft, failed, unpublished or review-ready content remains in this database scope.')
  return notes
}

function totalsForProgrammes(programmes: readonly DatabaseProgrammeCoverage[]): DatabaseCoverageTotals {
  return programmes.flatMap((programme) => programme.semesters).reduce(addSemesterToTotals, {
    programmes: programmes.length,
    semesters: 0,
    publishedSchemes: programmes.filter((programme) => programme.schemeStatus === 'published').length,
    subjects: 0,
    units: 0,
    topics: 0,
    lessons: 0,
    lessonsWithPrimaryVideo: 0,
    lessonsWithApprovedHtmlNotes: 0,
    lessonsWithApprovedPdf: 0,
    lessonsWithPractice: 0,
    approvedLessonResources: 0,
    approvedGeneratedDocuments: 0,
    publishedResources: 0,
    brokenResources: 0,
    publishedQuestions: 0,
    publishedPracticalExperiments: 0,
    publishedCodingChallenges: 0,
    pendingReviewItems: 0,
  })
}

function addSemesterToTotals(
  totals: DatabaseCoverageTotals,
  semester: DatabaseSemesterCoverage,
): DatabaseCoverageTotals {
  return {
    ...totals,
    semesters: totals.semesters + 1,
    subjects: totals.subjects + semester.subjects,
    units: totals.units + semester.units,
    topics: totals.topics + semester.topics,
    lessons: totals.lessons + semester.lessons,
    lessonsWithPrimaryVideo: totals.lessonsWithPrimaryVideo + semester.lessonsWithPrimaryVideo,
    lessonsWithApprovedHtmlNotes: totals.lessonsWithApprovedHtmlNotes + semester.lessonsWithApprovedHtmlNotes,
    lessonsWithApprovedPdf: totals.lessonsWithApprovedPdf + semester.lessonsWithApprovedPdf,
    lessonsWithPractice: totals.lessonsWithPractice + semester.lessonsWithPractice,
    approvedLessonResources: totals.approvedLessonResources + semester.approvedLessonResources,
    approvedGeneratedDocuments: totals.approvedGeneratedDocuments + semester.approvedGeneratedDocuments,
    publishedResources: totals.publishedResources + semester.publishedResources,
    brokenResources: totals.brokenResources + semester.brokenResources,
    publishedQuestions: totals.publishedQuestions + semester.publishedQuestions,
    publishedPracticalExperiments: totals.publishedPracticalExperiments + semester.publishedPracticalExperiments,
    publishedCodingChallenges: totals.publishedCodingChallenges + semester.publishedCodingChallenges,
    pendingReviewItems: totals.pendingReviewItems + semester.pendingReviewItems,
  }
}

import 'server-only'

import { createHash, randomUUID } from 'node:crypto'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { studentLessonResourceWhere } from '@/lib/resources/student-publication-policy'
import { lessonRouteSlug } from '@/features/learning/utils/lesson-slugs'
import {
  LessonNoteDocumentSchema,
  renderLessonNoteHtml,
  type LessonNoteDocument,
} from './lesson-note-document'
import { lessonNoteArtifactBaseName } from './lesson-note-artifacts'
import {
  generatedDocumentStatusForJobState,
  validateGenerationJobTransition,
  type ContentGenerationJobState,
} from './generation-workflow'

const DEFAULT_TEMPLATE_VERSION = 'lesson-notes-v1'
const DEFAULT_LEASE_MS = 5 * 60 * 1000
const DEFAULT_MAX_ATTEMPTS = 3
const DEFAULT_HTTP_TIMEOUT_MS = 45_000
const SUPPORTED_DOCUMENT_TYPES = ['lesson_notes', 'quick_notes', 'revision_sheet', 'formula_sheet'] as const

type SupportedDocumentType = (typeof SUPPORTED_DOCUMENT_TYPES)[number]

export interface LessonNoteGenerationInput {
  jobId: string
  lesson: {
    id: string
    title: string
    status: string
    order: number
    durationMin: number
    slug: string
    deepLink: string
  }
  programme: {
    code: string
  }
  semester: {
    number: number
  }
  subject: {
    id: string
    code: string
    name: string
    sourceEvidence: string | null
  }
  unit: {
    id: string
    number: number
    title: string
    outcomes: string | null
    sourceEvidence: string | null
  }
  topic: {
    id: string
    title: string
    outcomes: string | null
    sourceEvidence: string | null
  } | null
  documentType: SupportedDocumentType
  targetVersion: number
  templateVersion: string
  courseOutcomes: Array<{
    code: string
    text: string
    sourceEvidence: string | null
  }>
  approvedResources: Array<{
    id: string
    role: string
    title: string
    type: string
    url: string | null
    canonicalUrl: string | null
    provider: string | null
    creator: string | null
    durationSeconds: number | null
    language: string | null
    coveragePercentage: number | null
    transcriptSnippets: string[]
  }>
  references: Array<{
    id: string
    title: string
    author: string | null
    url: string | null
    sourceEvidence: string | null
  }>
  allowedSourceIds: string[]
  sourceHash: string
}

export interface LessonNoteGenerationOutput {
  document: unknown
  provider?: string | null
  model?: string | null
  rawValidation?: unknown
}

export interface LessonNoteGenerationProvider {
  readonly provider: string
  readonly model?: string | null
  generate(input: LessonNoteGenerationInput, signal?: AbortSignal): Promise<LessonNoteGenerationOutput>
}

export interface LessonNoteArtifactStore {
  putText(input: {
    key: string
    contentType: string
    body: string
  }): Promise<{ objectKey: string }>
}

export interface ProcessContentGenerationJobOptions {
  provider: LessonNoteGenerationProvider
  artifactStore: LessonNoteArtifactStore
  leaseOwner?: string
  leaseMs?: number
  maxAttempts?: number
  now?: Date
  signal?: AbortSignal
}

export type ProcessContentGenerationJobResult =
  | { status: 'idle' }
  | { status: 'awaiting_review'; jobId: string; generatedDocumentId: string; htmlObjectKey: string }
  | { status: 'validation_failed'; jobId: string; errors: string[] }
  | { status: 'requeued'; jobId: string; errorMessage: string; nextAttemptAfter: Date }
  | { status: 'failed'; jobId: string; errorMessage: string }

type ClaimedGenerationJob = {
  id: string
  lessonId: string
  jobType: string
  state: string
  attemptCount: number
  provider: string | null
  model: string | null
  templateVersion: string | null
  generatedDocumentId: string | null
  requestedById: string | null
}

export async function processNextContentGenerationJob(
  options: ProcessContentGenerationJobOptions,
): Promise<ProcessContentGenerationJobResult> {
  const claimed = await claimNextContentGenerationJob(options)
  if (!claimed) return { status: 'idle' }
  return processClaimedContentGenerationJob(claimed, options)
}

export async function claimNextContentGenerationJob(
  options: Pick<ProcessContentGenerationJobOptions, 'leaseOwner' | 'leaseMs' | 'maxAttempts' | 'now'> = {},
): Promise<ClaimedGenerationJob | null> {
  const now = options.now ?? new Date()
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS
  const leaseUntil = new Date(now.getTime() + (options.leaseMs ?? DEFAULT_LEASE_MS))
  const leaseOwner = options.leaseOwner ?? `worker:${randomUUID()}`

  return db.$transaction(async (tx) => {
    const job = await tx.contentGenerationJob.findFirst({
      where: {
        jobType: { in: [...SUPPORTED_DOCUMENT_TYPES] },
        state: { in: ['queued', 'validation_failed'] },
        attemptCount: { lt: maxAttempts },
        OR: [
          { leaseUntil: null },
          { leaseUntil: { lte: now } },
        ],
      },
      orderBy: [
        { updatedAt: 'asc' },
        { createdAt: 'asc' },
      ],
      select: generationJobSelect,
    })

    if (!job) return null

    const transition = validateGenerationJobTransition(
      job.state as ContentGenerationJobState,
      'running',
    )
    if (!transition.allowed) {
      await tx.contentGenerationJob.update({
        where: { id: job.id },
        data: {
          state: 'failed',
          errorCode: 'INVALID_STATE_TRANSITION',
          errorMessage: transition.errors.join(' '),
          leaseOwner: null,
          leaseUntil: null,
        },
        select: { id: true },
      })
      return null
    }

    return tx.contentGenerationJob.update({
      where: { id: job.id },
      data: {
        state: 'running',
        attemptCount: { increment: 1 },
        leaseOwner,
        leaseUntil,
        startedAt: now,
        provider: job.provider ?? null,
        model: job.model ?? null,
        errorCode: null,
        errorMessage: null,
      },
      select: generationJobSelect,
    })
  })
}

export async function processClaimedContentGenerationJob(
  job: ClaimedGenerationJob,
  options: ProcessContentGenerationJobOptions,
): Promise<ProcessContentGenerationJobResult> {
  const now = options.now ?? new Date()
  try {
    const input = await buildLessonNoteGenerationInput(job)
    await db.contentGenerationJob.update({
      where: { id: job.id },
      data: {
        inputSummaryJson: JSON.stringify(summarizeGenerationInput(input)),
        provider: job.provider ?? options.provider.provider,
        model: job.model ?? options.provider.model ?? null,
        templateVersion: input.templateVersion,
      },
      select: { id: true },
    })

    const generated = await options.provider.generate(input, options.signal)
    const validation = validateGeneratedLessonNoteDocument(generated.document, input)

    if (!validation.valid) {
      await markJobValidationFailed(job, validation.errors, generated.rawValidation, now)
      return { status: 'validation_failed', jobId: job.id, errors: validation.errors }
    }

    const document = validation.document
    const html = renderLessonNoteHtml(document)
    const htmlKey = lessonNoteHtmlObjectKey(document)
    const stored = await options.artifactStore.putText({
      key: htmlKey,
      contentType: 'text/html; charset=utf-8',
      body: html,
    })

    const contentHash = hashJson({ document, html })
    const sourceVideoResourceIds = input.approvedResources
      .filter((resource) => resource.type === 'video_link' || resource.role.includes('video'))
      .map((resource) => resource.id)

    const result = await db.$transaction(async (tx) => {
      const generatedDocument = job.generatedDocumentId
        ? await tx.generatedLessonDocument.update({
            where: { id: job.generatedDocumentId },
            data: generatedDocumentData({
              job,
              input,
              document,
              generated,
              htmlObjectKey: stored.objectKey,
              contentHash,
              sourceVideoResourceIds,
              now,
            }),
            select: { id: true },
          })
        : await tx.generatedLessonDocument.create({
            data: {
              lessonId: job.lessonId,
              ...generatedDocumentData({
                job,
                input,
                document,
                generated,
                htmlObjectKey: stored.objectKey,
                contentHash,
                sourceVideoResourceIds,
                now,
              }),
            },
            select: { id: true },
          })

      await tx.contentGenerationJob.update({
        where: { id: job.id },
        data: {
          state: 'awaiting_review',
          generatedDocumentId: generatedDocument.id,
          validationJson: JSON.stringify({ passed: true, checkedAt: now.toISOString() }),
          errorCode: null,
          errorMessage: null,
          leaseOwner: null,
          leaseUntil: null,
        },
        select: { id: true },
      })

      await tx.auditEvent.create({
        data: {
          actorUserId: job.requestedById,
          action: 'lesson_note.generated_for_review',
          entityType: 'GeneratedLessonDocument',
          entityId: generatedDocument.id,
          summary: `Generated ${document.documentType.replace(/_/g, ' ')} for ${input.lesson.title}`,
          metadata: JSON.stringify({
            jobId: job.id,
            lessonId: input.lesson.id,
            documentType: document.documentType,
            provider: generated.provider ?? options.provider.provider,
            model: generated.model ?? options.provider.model ?? null,
          }),
        },
      })

      return generatedDocument
    })

    return {
      status: 'awaiting_review',
      jobId: job.id,
      generatedDocumentId: result.id,
      htmlObjectKey: stored.objectKey,
    }
  } catch (error) {
    return handleGenerationError(job, error, options, now)
  }
}

export async function buildLessonNoteGenerationInput(
  job: Pick<ClaimedGenerationJob, 'id' | 'lessonId' | 'jobType' | 'templateVersion' | 'generatedDocumentId'>,
): Promise<LessonNoteGenerationInput> {
  const documentType = normalizeDocumentType(job.jobType)
  const lesson = await db.lesson.findUnique({
    where: { id: job.lessonId },
    include: {
      unit: {
        include: {
          subject: subjectGenerationInclude,
        },
      },
      topic: {
        include: {
          unit: {
            include: {
              subject: subjectGenerationInclude,
            },
          },
        },
      },
      resources: {
        where: studentLessonResourceWhere(),
        orderBy: [{ role: 'asc' }, { isPrimary: 'desc' }, { sortOrder: 'asc' }],
        select: {
          id: true,
          role: true,
          coveragePercentage: true,
          resource: {
            select: {
              id: true,
              title: true,
              type: true,
              url: true,
              canonicalUrl: true,
              provider: true,
              creator: true,
              durationSeconds: true,
              language: true,
              content: true,
              videoChapters: {
                where: {
                  status: { in: ['approved', 'published', 'verified'] },
                  verificationStatus: { in: ['approved', 'verified'] },
                },
                orderBy: [{ order: 'asc' }, { startSeconds: 'asc' }],
                select: {
                  transcriptSnippet: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!lesson) throw new Error('LESSON_NOT_FOUND')
  if (!['published', 'verified'].includes(lesson.status)) {
    throw new Error('LESSON_NOT_READY_FOR_GENERATION')
  }

  const unit = lesson.topic?.unit ?? lesson.unit
  if (!unit) throw new Error('LESSON_UNIT_NOT_FOUND')

  const subject = unit.subject
  const programmeCode = subject.scheme.programme?.code
  if (!programmeCode) throw new Error('PROGRAMME_CODE_NOT_FOUND')

  const existingDocument = job.generatedDocumentId
    ? await db.generatedLessonDocument.findUnique({
        where: { id: job.generatedDocumentId },
        select: { version: true },
      })
    : null
  const latestDocument = job.generatedDocumentId
    ? null
    : await db.generatedLessonDocument.findFirst({
        where: { lessonId: job.lessonId, documentType },
        orderBy: { version: 'desc' },
        select: { version: true },
      })

  const targetVersion = existingDocument?.version ?? ((latestDocument?.version ?? 0) + 1)
  const slug = lessonRouteSlug({ id: lesson.id, title: lesson.title, order: lesson.order })
  const deepLink = absoluteAppUrl(
    `/learn/${programmeCode}/semester/${subject.semester.number}/subject/${subject.code}/lesson/${slug}`,
  )

  const references = subject.recommendedReferences
    .filter((reference) => ['active', 'published', 'verified'].includes(reference.status))
    .map((reference) => ({
      id: reference.id,
      title: reference.title,
      author: reference.author,
      url: reference.url,
      sourceEvidence: reference.sourceEvidence,
    }))

  const approvedResources = lesson.resources.map((mapping) => ({
    id: mapping.resource.id,
    role: mapping.role,
    title: mapping.resource.title,
    type: mapping.resource.type,
    url: mapping.resource.url,
    canonicalUrl: mapping.resource.canonicalUrl,
    provider: mapping.resource.provider,
    creator: mapping.resource.creator,
    durationSeconds: mapping.resource.durationSeconds,
    language: mapping.resource.language,
    coveragePercentage: mapping.coveragePercentage,
    transcriptSnippets: [
      mapping.resource.content,
      ...mapping.resource.videoChapters.map((chapter) => chapter.transcriptSnippet),
    ].filter((value): value is string => Boolean(value?.trim())).slice(0, 20),
  }))

  const allowedSourceIds = [
    `official-curriculum:${subject.code}`,
    `official-unit:${subject.code}:${unit.number}`,
    lesson.topic ? `official-topic:${lesson.topic.id}` : null,
    ...approvedResources.map((resource) => `approved-resource:${resource.id}`),
    ...references.map((reference) => `approved-reference:${reference.id}`),
  ].filter((value): value is string => Boolean(value))

  const input: LessonNoteGenerationInput = {
    jobId: job.id,
    lesson: {
      id: lesson.id,
      title: lesson.title,
      status: lesson.status,
      order: lesson.order,
      durationMin: lesson.durationMin,
      slug,
      deepLink,
    },
    programme: { code: programmeCode },
    semester: { number: subject.semester.number },
    subject: {
      id: subject.id,
      code: subject.code,
      name: subject.name,
      sourceEvidence: subject.sourceEvidence,
    },
    unit: {
      id: unit.id,
      number: unit.number,
      title: unit.title,
      outcomes: unit.outcomes,
      sourceEvidence: unit.sourceEvidence,
    },
    topic: lesson.topic
      ? {
          id: lesson.topic.id,
          title: lesson.topic.title,
          outcomes: lesson.topic.outcomes,
          sourceEvidence: lesson.topic.sourceEvidence,
        }
      : null,
    documentType,
    targetVersion,
    templateVersion: job.templateVersion ?? DEFAULT_TEMPLATE_VERSION,
    courseOutcomes: subject.courseOutcomes
      .filter((outcome) => ['active', 'published', 'verified'].includes(outcome.status))
      .sort((a, b) => a.order - b.order || a.code.localeCompare(b.code))
      .map((outcome) => ({
        code: outcome.code,
        text: outcome.text,
        sourceEvidence: outcome.sourceEvidence,
      })),
    approvedResources,
    references,
    allowedSourceIds,
    sourceHash: '',
  }

  return {
    ...input,
    sourceHash: hashJson({
      lesson: input.lesson,
      subject: input.subject,
      unit: input.unit,
      topic: input.topic,
      courseOutcomes: input.courseOutcomes,
      approvedResources: input.approvedResources,
      references: input.references,
    }),
  }
}

export function validateGeneratedLessonNoteDocument(
  value: unknown,
  input: LessonNoteGenerationInput,
): { valid: true; document: LessonNoteDocument } | { valid: false; errors: string[] } {
  const result = LessonNoteDocumentSchema.safeParse(value)
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.issues.map((issue) => issue.message),
    }
  }

  const document = result.data
  const errors: string[] = []

  if (document.verificationStatus === 'approved' || document.verificationStatus === 'published') {
    errors.push('Generated documents cannot self-approve or self-publish.')
  }
  if (document.documentType !== input.documentType) {
    errors.push('Generated document type does not match the queued job.')
  }
  if (document.templateVersion !== input.templateVersion) {
    errors.push('Generated document template version does not match the queued job.')
  }
  if (document.programmeCode !== input.programme.code) {
    errors.push('Generated document programme does not match the lesson programme.')
  }
  if (document.semesterNumber !== input.semester.number) {
    errors.push('Generated document semester does not match the lesson semester.')
  }
  if (document.subjectCode !== input.subject.code) {
    errors.push('Generated document subject does not match the lesson subject.')
  }
  if (document.unitNumber !== input.unit.number) {
    errors.push('Generated document unit does not match the lesson unit.')
  }
  if (document.lessonSlug !== input.lesson.slug) {
    errors.push('Generated document lesson slug does not match the canonical lesson.')
  }
  if (document.deepLink !== input.lesson.deepLink) {
    errors.push('Generated document deep link does not match the canonical lesson route.')
  }
  if (document.version !== input.targetVersion) {
    errors.push('Generated document version does not match the target version.')
  }

  const undeclaredSources = document.sources
    .map((source) => source.id)
    .filter((sourceId) => !input.allowedSourceIds.includes(sourceId))
  if (undeclaredSources.length > 0) {
    errors.push(`Generated document cites unapproved source ids: ${undeclaredSources.join(', ')}.`)
  }

  if (errors.length > 0) return { valid: false, errors }

  return {
    valid: true,
    document: {
      ...document,
      verificationStatus: 'ready_for_review',
    },
  }
}

export function createConfiguredLessonNoteGenerationProvider(
  env: NodeJS.ProcessEnv = process.env,
): LessonNoteGenerationProvider | null {
  const url = env.LESSON_NOTE_GENERATOR_URL?.trim()
  if (!url) return null
  const token = env.LESSON_NOTE_GENERATOR_TOKEN?.trim()
  if (env.NODE_ENV === 'production' && !token) {
    throw new Error('LESSON_NOTE_GENERATOR_TOKEN is required in production.')
  }

  return new HttpLessonNoteGenerationProvider({
    url,
    token,
    provider: env.LESSON_NOTE_GENERATOR_PROVIDER?.trim() || 'lesson-note-http',
    model: env.LESSON_NOTE_GENERATOR_MODEL?.trim() || null,
    timeoutMs: readPositiveInt(env.LESSON_NOTE_GENERATOR_TIMEOUT_MS, DEFAULT_HTTP_TIMEOUT_MS, 5_000, 120_000),
  })
}

export function createConfiguredLessonNoteArtifactStore(
  env: NodeJS.ProcessEnv = process.env,
): LessonNoteArtifactStore | null {
  const url = env.LESSON_NOTE_ARTIFACT_STORE_URL?.trim()
  if (!url) return null
  const token = env.LESSON_NOTE_ARTIFACT_STORE_TOKEN?.trim()
  if (env.NODE_ENV === 'production' && !token) {
    throw new Error('LESSON_NOTE_ARTIFACT_STORE_TOKEN is required in production.')
  }

  return new HttpLessonNoteArtifactStore({
    url,
    token,
    timeoutMs: readPositiveInt(env.LESSON_NOTE_ARTIFACT_STORE_TIMEOUT_MS, DEFAULT_HTTP_TIMEOUT_MS, 5_000, 120_000),
  })
}

class HttpLessonNoteGenerationProvider implements LessonNoteGenerationProvider {
  readonly provider: string
  readonly model: string | null
  private readonly url: string
  private readonly token: string | undefined
  private readonly timeoutMs: number

  constructor(input: {
    url: string
    token?: string
    provider: string
    model: string | null
    timeoutMs: number
  }) {
    this.url = input.url
    this.token = input.token
    this.provider = input.provider
    this.model = input.model
    this.timeoutMs = input.timeoutMs
  }

  async generate(input: LessonNoteGenerationInput, signal?: AbortSignal): Promise<LessonNoteGenerationOutput> {
    const response = await postJsonWithTimeout(
      this.url,
      {
        jobId: input.jobId,
        documentType: input.documentType,
        targetVersion: input.targetVersion,
        templateVersion: input.templateVersion,
        sourceHash: input.sourceHash,
        input,
      },
      this.token,
      this.timeoutMs,
      signal,
    )
    const data = await response.json() as {
      document?: unknown
      provider?: string | null
      model?: string | null
      validation?: unknown
    }

    if (!data.document) throw new Error('LESSON_NOTE_GENERATOR_EMPTY_DOCUMENT')
    return {
      document: data.document,
      provider: data.provider ?? this.provider,
      model: data.model ?? this.model,
      rawValidation: data.validation,
    }
  }
}

class HttpLessonNoteArtifactStore implements LessonNoteArtifactStore {
  private readonly url: string
  private readonly token: string | undefined
  private readonly timeoutMs: number

  constructor(input: {
    url: string
    token?: string
    timeoutMs: number
  }) {
    this.url = input.url
    this.token = input.token
    this.timeoutMs = input.timeoutMs
  }

  async putText(input: {
    key: string
    contentType: string
    body: string
  }): Promise<{ objectKey: string }> {
    const response = await postJsonWithTimeout(
      this.url,
      {
        key: input.key,
        contentType: input.contentType,
        bodyBase64: Buffer.from(input.body, 'utf8').toString('base64'),
      },
      this.token,
      this.timeoutMs,
    )
    const data = await response.json() as { objectKey?: string }
    return { objectKey: data.objectKey?.trim() || input.key }
  }
}

async function postJsonWithTimeout(
  url: string,
  body: unknown,
  token: string | undefined,
  timeoutMs: number,
  externalSignal?: AbortSignal,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort('timeout'), timeoutMs)
  const abort = () => controller.abort('external_abort')
  externalSignal?.addEventListener('abort', abort, { once: true })

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    })
    if (response.ok) return response
    const text = await response.text().catch(() => '')
    throw new Error(`HTTP_${response.status}${text ? `: ${text.slice(0, 300)}` : ''}`)
  } finally {
    clearTimeout(timer)
    externalSignal?.removeEventListener('abort', abort)
  }
}

function generatedDocumentData(input: {
  job: ClaimedGenerationJob
  input: LessonNoteGenerationInput
  document: LessonNoteDocument
  generated: LessonNoteGenerationOutput
  htmlObjectKey: string
  contentHash: string
  sourceVideoResourceIds: string[]
  now: Date
}) {
  return {
    documentType: input.document.documentType,
    sourceVideoResourceIds: JSON.stringify(input.sourceVideoResourceIds),
    sourceTranscriptHash: input.input.sourceHash,
    curriculumSourceIds: JSON.stringify(input.input.allowedSourceIds),
    templateVersion: input.document.templateVersion,
    aiProvider: input.generated.provider ?? null,
    aiModel: input.generated.model ?? null,
    generationStatus: generatedDocumentStatusForJobState('awaiting_review'),
    validationResults: JSON.stringify({
      passed: true,
      checkedAt: input.now.toISOString(),
      providerValidation: input.generated.rawValidation ?? null,
    }),
    reviewerId: null,
    publisherId: null,
    generatedAt: input.now,
    reviewedAt: null,
    publishedAt: null,
    storageObjectKey: null,
    htmlObjectKey: input.htmlObjectKey,
    thumbnailObjectKey: null,
    pageCount: null,
    contentHash: input.contentHash,
    version: input.document.version,
  }
}

async function markJobValidationFailed(
  job: Pick<ClaimedGenerationJob, 'id' | 'generatedDocumentId'>,
  errors: string[],
  providerValidation: unknown,
  now: Date,
) {
  const transition = validateGenerationJobTransition('running', 'validation_failed')
  const validationJson = JSON.stringify({
    passed: false,
    checkedAt: now.toISOString(),
    errors,
    providerValidation: providerValidation ?? null,
  })

  await db.$transaction(async (tx) => {
    if (job.generatedDocumentId) {
      await tx.generatedLessonDocument.update({
        where: { id: job.generatedDocumentId },
        data: {
          generationStatus: generatedDocumentStatusForJobState('validation_failed'),
          validationResults: validationJson,
          generatedAt: now,
        },
        select: { id: true },
      })
    }

    await tx.contentGenerationJob.update({
      where: { id: job.id },
      data: {
        state: transition.allowed ? 'validation_failed' : 'failed',
        validationJson,
        errorCode: 'VALIDATION_FAILED',
        errorMessage: errors.join(' ').slice(0, 1000),
        leaseOwner: null,
        leaseUntil: null,
      },
      select: { id: true },
    })
  })
}

async function handleGenerationError(
  job: ClaimedGenerationJob,
  error: unknown,
  options: Pick<ProcessContentGenerationJobOptions, 'maxAttempts'>,
  now: Date,
): Promise<ProcessContentGenerationJobResult> {
  const errorMessage = safeErrorMessage(error)
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS
  const canRetry = job.attemptCount < maxAttempts
  const nextState = canRetry ? 'queued' : 'failed'
  const transition = validateGenerationJobTransition('running', nextState as ContentGenerationJobState, {
    errorMessage,
  })
  const retryDelayMs = retryDelayForAttempt(job.attemptCount)
  const nextAttemptAfter = new Date(now.getTime() + retryDelayMs)

  await db.contentGenerationJob.update({
    where: { id: job.id },
    data: {
      state: transition.allowed ? nextState : 'failed',
      errorCode: canRetry ? 'GENERATION_RETRYABLE_ERROR' : 'GENERATION_FAILED',
      errorMessage,
      leaseOwner: null,
      leaseUntil: canRetry ? nextAttemptAfter : null,
      validationJson: null,
      completedAt: canRetry ? null : now,
    },
    select: { id: true },
  })

  if (canRetry && transition.allowed) {
    return { status: 'requeued', jobId: job.id, errorMessage, nextAttemptAfter }
  }
  return { status: 'failed', jobId: job.id, errorMessage }
}

function summarizeGenerationInput(input: LessonNoteGenerationInput) {
  return {
    lessonId: input.lesson.id,
    lessonTitle: input.lesson.title,
    programmeCode: input.programme.code,
    semesterNumber: input.semester.number,
    subjectCode: input.subject.code,
    unitNumber: input.unit.number,
    topicId: input.topic?.id ?? null,
    documentType: input.documentType,
    targetVersion: input.targetVersion,
    templateVersion: input.templateVersion,
    sourceHash: input.sourceHash,
    courseOutcomeCount: input.courseOutcomes.length,
    approvedResourceCount: input.approvedResources.length,
    referenceCount: input.references.length,
  }
}

function lessonNoteHtmlObjectKey(document: LessonNoteDocument): string {
  return `lesson-notes/${lessonNoteArtifactBaseName(document)}.html`
}

function absoluteAppUrl(path: string): string {
  const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null
  const base = process.env.NEXTAUTH_URL?.trim() || vercelUrl || 'http://localhost:3000'
  return new URL(path, base).toString()
}

function normalizeDocumentType(value: string): SupportedDocumentType {
  if ((SUPPORTED_DOCUMENT_TYPES as readonly string[]).includes(value)) {
    return value as SupportedDocumentType
  }
  throw new Error('UNSUPPORTED_GENERATION_JOB_TYPE')
}

function hashJson(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex')
}

function retryDelayForAttempt(attemptCount: number): number {
  return Math.min(30 * 60 * 1000, Math.max(30_000, 30_000 * 2 ** Math.max(0, attemptCount - 1)))
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`.slice(0, 1000)
  return String(error).slice(0, 1000)
}

function readPositiveInt(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(max, Math.round(parsed)))
}

const generationJobSelect = {
  id: true,
  lessonId: true,
  jobType: true,
  state: true,
  attemptCount: true,
  provider: true,
  model: true,
  templateVersion: true,
  generatedDocumentId: true,
  requestedById: true,
} as const

const subjectGenerationInclude = {
  include: {
    semester: { select: { number: true } },
    scheme: {
      select: {
        programme: { select: { code: true } },
      },
    },
    courseOutcomes: {
      select: {
        code: true,
        text: true,
        order: true,
        status: true,
        sourceEvidence: true,
      },
    },
    recommendedReferences: {
      select: {
        id: true,
        title: true,
        author: true,
        url: true,
        status: true,
        sourceEvidence: true,
      },
    },
  },
} satisfies Prisma.SubjectDefaultArgs

import 'server-only'

import { createHash } from 'node:crypto'
import { z } from 'zod'
import { db } from '@/lib/db'
import { ApiError } from '@/lib/auth'
import { writeAuditEvent } from '@/lib/authority/audit'

const SOURCE_TYPES = [
  'official_pdf',
  'structure_sheet',
  'amendment',
  'circular',
  'assessment_scheme',
  'lab_manual',
  'model_answer',
  'internal_verified_document',
] as const

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^::1$/,
]

export const CreateSyllabusSourceSchema = z
  .object({
    institutionId: z.string().min(1),
    departmentId: z.string().min(1).nullable().optional(),
    programmeId: z.string().min(1).nullable().optional(),
    schemeId: z.string().min(1).nullable().optional(),
    title: z.string().trim().min(3).max(240),
    sourceType: z.enum(SOURCE_TYPES),
    sourceUrl: z.string().trim().url().max(2000).nullable().optional(),
    objectKey: z.string().trim().max(1000).nullable().optional(),
    revisionLabel: z.string().trim().max(80).nullable().optional(),
    trustLevel: z.string().trim().max(40).default('official'),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.sourceUrl && !value.objectKey) {
      ctx.addIssue({
        code: 'custom',
        message: 'Provide a source URL or uploaded object key.',
        path: ['sourceUrl'],
      })
    }
    if (value.sourceUrl) validateSourceUrl(value.sourceUrl, ctx)
  })

export const QueueImportSchema = z.object({
  syllabusDocumentId: z.string().min(1),
  parserVersion: z.string().trim().min(1).max(80).default('manual-review-v1'),
})

export type CreateSyllabusSourceInput = z.infer<typeof CreateSyllabusSourceSchema>
export type QueueImportInput = z.infer<typeof QueueImportSchema>

export async function listSyllabusSources(input: { page?: number; pageSize?: number; q?: string } = {}) {
  const page = Math.max(1, input.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 20))
  const q = input.q?.trim()
  const where = q
    ? {
        OR: [
          { title: { contains: q, mode: 'insensitive' as const } },
          { revisionLabel: { contains: q, mode: 'insensitive' as const } },
          { sourceUrl: { contains: q, mode: 'insensitive' as const } },
        ],
      }
    : {}

  const [total, sources] = await Promise.all([
    db.syllabusDocument.count({ where }),
    db.syllabusDocument.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        sourceType: true,
        sourceUrl: true,
        revisionLabel: true,
        trustLevel: true,
        status: true,
        pageCount: true,
        checksum: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { snapshots: true, importJobs: true } },
      },
    }),
  ])

  return { sources, pagination: { total, page, pageSize } }
}

export async function createSyllabusSource(input: CreateSyllabusSourceInput, actorUserId: string) {
  const parsed = CreateSyllabusSourceSchema.parse(input)
  const checksum = checksumForSource(parsed)

  return db.$transaction(async (tx) => {
    const source = await tx.syllabusDocument.create({
      data: {
        institutionId: parsed.institutionId,
        departmentId: parsed.departmentId ?? null,
        programmeId: parsed.programmeId ?? null,
        schemeId: parsed.schemeId ?? null,
        title: parsed.title,
        sourceType: parsed.sourceType,
        sourceUrl: parsed.sourceUrl ?? null,
        objectKey: parsed.objectKey ?? null,
        revisionLabel: parsed.revisionLabel ?? null,
        trustLevel: parsed.trustLevel,
        status: 'registered',
        checksum,
        uploadedById: actorUserId,
        notes: parsed.notes ?? null,
      },
      select: { id: true, title: true, status: true, checksum: true },
    })

    await tx.sourceSnapshot.create({
      data: {
        syllabusDocumentId: source.id,
        sourceUrl: parsed.sourceUrl ?? null,
        objectKey: parsed.objectKey ?? null,
        checksum,
        fetchStatus: 'registered',
        fetchMetadata: JSON.stringify({
          sourceType: parsed.sourceType,
          revisionLabel: parsed.revisionLabel ?? null,
          registeredOnly: true,
        }),
        createdById: actorUserId,
      },
    })

    await tx.auditEvent.create({
      data: {
        actorUserId,
        action: 'syllabus.source.registered',
        entityType: 'SyllabusDocument',
        entityId: source.id,
        summary: `Registered syllabus source ${source.title}`,
        metadata: JSON.stringify({ sourceType: parsed.sourceType, revisionLabel: parsed.revisionLabel ?? null }),
      },
    })

    return source
  })
}

export async function listSyllabusImportJobs(input: { page?: number; pageSize?: number; state?: string } = {}) {
  const page = Math.max(1, input.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 20))
  const where = input.state ? { state: input.state } : {}

  const [total, jobs] = await Promise.all([
    db.syllabusImportJob.count({ where }),
    db.syllabusImportJob.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        state: true,
        parserVersion: true,
        attemptCount: true,
        warnings: true,
        errorCode: true,
        resultSummary: true,
        createdAt: true,
        updatedAt: true,
        syllabusDocument: { select: { id: true, title: true, sourceType: true, revisionLabel: true } },
        _count: { select: { findings: true } },
      },
    }),
  ])

  return { jobs, pagination: { total, page, pageSize } }
}

export async function queueSyllabusImport(input: QueueImportInput, actorUserId: string) {
  const parsed = QueueImportSchema.parse(input)
  const source = await db.syllabusDocument.findUnique({
    where: { id: parsed.syllabusDocumentId },
    select: { id: true, title: true, status: true, snapshots: { orderBy: { fetchedAt: 'desc' }, take: 1, select: { id: true } } },
  })

  if (!source) {
    throw new ApiError('NOT_FOUND', 'Syllabus source not found.', 404, false)
  }

  const job = await db.$transaction(async (tx) => {
    const created = await tx.syllabusImportJob.create({
      data: {
        syllabusDocumentId: source.id,
        sourceSnapshotId: source.snapshots[0]?.id ?? null,
        state: 'queued',
        parserVersion: parsed.parserVersion,
        requestedById: actorUserId,
        logs: JSON.stringify([{ at: new Date().toISOString(), message: 'Queued for human-reviewed extraction.' }]),
      },
      select: { id: true, state: true, parserVersion: true },
    })

    await tx.jobRun.create({
      data: {
        key: `syllabus-import:${created.id}`,
        jobType: 'syllabus_import',
        state: 'queued',
        inputJson: JSON.stringify({ syllabusDocumentId: source.id, parserVersion: parsed.parserVersion }),
      },
    })

    await tx.auditEvent.create({
      data: {
        actorUserId,
        action: 'syllabus.import.queued',
        entityType: 'SyllabusImportJob',
        entityId: created.id,
        summary: `Queued import for ${source.title}`,
        metadata: JSON.stringify({ syllabusDocumentId: source.id, parserVersion: parsed.parserVersion }),
      },
    })

    return created
  })

  return job
}

export async function getSyllabusOpsSnapshot() {
  const [sources, snapshots, imports, openFindings, publishedVersions] = await Promise.all([
    db.syllabusDocument.count(),
    db.sourceSnapshot.count(),
    db.syllabusImportJob.count(),
    db.importFinding.count({ where: { resolutionStatus: 'open' } }),
    db.curriculumVersion.count({ where: { status: 'published' } }),
  ])

  return { sources, snapshots, imports, openFindings, publishedVersions }
}

function checksumForSource(input: CreateSyllabusSourceInput) {
  return createHash('sha256')
    .update(JSON.stringify({
      institutionId: input.institutionId,
      departmentId: input.departmentId ?? null,
      programmeId: input.programmeId ?? null,
      schemeId: input.schemeId ?? null,
      title: input.title,
      sourceType: input.sourceType,
      sourceUrl: input.sourceUrl ?? null,
      objectKey: input.objectKey ?? null,
      revisionLabel: input.revisionLabel ?? null,
    }))
    .digest('hex')
}

function validateSourceUrl(value: string, ctx: z.RefinementCtx) {
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    ctx.addIssue({ code: 'custom', message: 'Enter a valid source URL.', path: ['sourceUrl'] })
    return
  }

  if (!['https:', 'http:'].includes(parsed.protocol)) {
    ctx.addIssue({ code: 'custom', message: 'Only HTTP and HTTPS source URLs are supported.', path: ['sourceUrl'] })
  }

  if (PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(parsed.hostname))) {
    ctx.addIssue({ code: 'custom', message: 'Private or local source URLs are not allowed.', path: ['sourceUrl'] })
  }
}

export async function auditSyllabusAction(input: {
  actorUserId: string
  action: string
  entityType: string
  entityId?: string | null
  summary: string
  metadata?: Record<string, unknown>
}) {
  return writeAuditEvent(input)
}

/**
 * Real lesson-content retrieval pipeline.
 *
 * Replaces the previous "fake citation" pattern (where citations were
 * fabricated from UI context strings like `subjectName`/`topicTitle`). This
 * module loads ACTUAL `Lesson` rows from the database, parses their five-mode
 * JSON content fields, and returns the relevant chunks with full source
 * metadata so the AI provider can cite them honestly.
 *
 * Server-only — uses Prisma directly.
 *
 * Selection heuristic (lightweight, no embeddings required):
 *  1. If `topicTitle` is given, match lessons whose Topic.title contains it
 *     (case-insensitive). Top priority.
 *  2. If `unitTitle` is given, widen to lessons under matching Units.
 *  3. If `subjectName` is given, widen to lessons under matching Subjects.
 *  4. Only return chunks from `published` or `verified` lessons.
 *  5. Cap at top 5 lessons (by specificity), expanding each into ≤5 chunks.
 */
import 'server-only'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import type { Citation } from '@/lib/ai/provider'
import {
  STUDENT_LESSON_RESOURCE_STATUSES,
  STUDENT_LESSON_RESOURCE_VERIFICATION_STATUSES,
  studentGeneratedDocumentWhere,
  studentLessonResourceWhere,
} from '@/lib/resources/student-publication-policy'

// ============================================================
// Public types
// ============================================================

export interface RetrievedChunk {
  sourceId: string
  title: string
  subject?: string
  unit?: string
  topic?: string
  location: string // e.g. "learn > definition", "revise > shortNotes"
  snippet: string
}

interface RetrievedSourceGroup {
  sourceId: string
  title: string
  subject?: string
  unit?: string
  topic?: string
  snippets: Array<{ location: string; snippet: string }>
}

export interface RetrieveParams {
  lessonId?: string
  subjectId?: string
  unitNumber?: number
  topicId?: string
  subjectName?: string
  unitTitle?: string
  topicTitle?: string
  allowedSubjectIds?: string[]
  /** Cap on number of lessons pulled (default 5). */
  maxLessons?: number
  /** Cap on number of chunks returned (default 12). */
  maxChunks?: number
}

// ============================================================
// Lesson content shape (mirrors src/components/views/learn.tsx)
// ============================================================

interface LearnContent {
  definition?: string
  purpose?: string
  prerequisites?: string[]
  coreConcepts?: { title: string; explanation: string }[]
  stepByStep?: string[]
  examples?: { title: string; content: string }[]
  commonErrors?: string[]
  examPoints?: string[]
  summary?: string
}

interface SimplifyContent {
  simpleEnglish?: string
  hinglish?: string
  analogy?: string
  fiveMinute?: string
  oneMinuteRecap?: string
  examFormat?: string
}

interface VisualiseContent {
  type?: string
  description?: string
  steps?: string[]
  reducedMotionAlt?: string
}

interface PractiseContent {
  guidedExamples?: { question: string; solution: string }[]
  easyQuestions?: string[]
  mediumQuestions?: string[]
  hardQuestions?: string[]
  hints?: string[]
}

interface ReviseContent {
  shortNotes?: string[]
  definitions?: { term: string; definition: string }[]
  formulas?: { name: string; formula: string; use: string }[]
  flashcards?: { front: string; back: string }[]
  commonConfusions?: { a: string; b: string; difference: string }[]
}

// ============================================================
// Public API
// ============================================================

/**
 * Retrieve real lesson chunks from the DB, scoped by the caller's
 * subject/unit/topic context. Returns at most `maxChunks` chunks.
 *
 * Returns an empty array if no matching published/verified lessons exist.
 */
export async function retrieveLessonContext(
  params: RetrieveParams,
): Promise<RetrievedChunk[]> {
  const { lessonId, subjectId, unitNumber, topicId, subjectName, unitTitle, topicTitle, allowedSubjectIds } = params
  if (!lessonId && !subjectId && !unitNumber && !topicId && !subjectName && !unitTitle && !topicTitle) return []
  if (allowedSubjectIds && allowedSubjectIds.length === 0) return []

  const lessons = await fetchLessons({
    subjectId,
    unitNumber,
    topicId,
    lessonId,
    subjectName,
    unitTitle,
    topicTitle,
    allowedSubjectIds,
  })
  if (lessons.length === 0) return []

  const maxLessons = params.maxLessons ?? 5
  const topLessons = lessons.slice(0, maxLessons)

  const chunks: RetrievedChunk[] = []
  for (const lesson of topLessons) {
    chunks.push(...lessonToChunks(lesson))
  }

  const maxChunks = params.maxChunks ?? 12
  return chunks.slice(0, maxChunks)
}

/**
 * Convert retrieved chunks into the Citation shape used by the provider/API.
 * Groups by sourceId so prompt context numbering and API citations stay aligned.
 */
export function chunksToCitations(chunks: RetrievedChunk[]): Citation[] {
  return groupChunksBySource(chunks).map((group) => ({
    sourceId: group.sourceId,
    title: group.title,
    subject: group.subject,
    unit: group.unit,
    topic: group.topic,
    location: group.snippets[0]?.location,
    snippet: truncate(group.snippets.map((item) => item.snippet).join(' '), 200),
  }))
}

/**
 * Render retrieved chunks as a compact text block suitable for inclusion in
 * the system prompt as grounding context for the LLM.
 */
export function chunksToContextBlock(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return ''
  const parts = groupChunksBySource(chunks).map((group, i) => {
    const header = `[${i + 1}] ${group.title}`
    const meta = [group.subject, group.unit, group.topic].filter(Boolean).join(' / ')
    const body = group.snippets
      .map((item) => `${item.location}:\n${item.snippet}`)
      .join('\n\n')
    return `${header}${meta ? ` (${meta})` : ''}:\n${body}`
  })
  return 'RETRIEVED COURSE CONTEXT (cite by [n] when referencing):\n\n' + parts.join('\n\n')
}

// ============================================================
// Internal: DB query
// ============================================================

type LessonWithRelations = Awaited<ReturnType<typeof fetchLessons>>[number]

async function fetchLessons(params: {
  subjectId?: string
  unitNumber?: number
  topicId?: string
  lessonId?: string
  subjectName?: string
  unitTitle?: string
  topicTitle?: string
  allowedSubjectIds?: string[]
}) {
  const idScoped: Prisma.LessonWhereInput[] = [
    params.lessonId ? { id: params.lessonId } : null,
    params.topicId ? { topicId: params.topicId } : null,
    params.unitNumber && params.subjectId
      ? {
          OR: [
            { unit: { number: params.unitNumber, subjectId: params.subjectId } },
            { topic: { unit: { number: params.unitNumber, subjectId: params.subjectId } } },
          ],
        }
      : null,
    params.subjectId
      ? {
          OR: [
            { unit: { subjectId: params.subjectId } },
            { topic: { unit: { subjectId: params.subjectId } } },
          ],
        }
      : null,
  ].filter(Boolean) as Prisma.LessonWhereInput[]

  const textScoped: Prisma.LessonWhereInput[] = [
    params.topicTitle
      ? {
          topic: {
            title: containsInsensitive(params.topicTitle),
          },
        }
      : null,
    params.unitTitle
      ? {
          unit: {
            title: containsInsensitive(params.unitTitle),
          },
        }
      : null,
    params.subjectName
      ? {
          topic: {
            unit: {
              subject: {
                name: containsInsensitive(params.subjectName),
              },
            },
          },
        }
      : null,
    params.subjectName
      ? {
          unit: {
            subject: {
              name: containsInsensitive(params.subjectName),
            },
          },
        }
      : null,
  ].filter(Boolean) as Prisma.LessonWhereInput[]

  // Prefer exact IDs owned by TutorSession. Text matching is a legacy fallback
  // for older sessions and deliberately remains case-insensitive.
  const where: Prisma.LessonWhereInput = {
    status: { in: ['published', 'verified'] },
    archivedAt: null,
    AND: [
      { OR: idScoped.length ? idScoped : textScoped },
      params.allowedSubjectIds
        ? {
            OR: [
              { unit: { subjectId: { in: params.allowedSubjectIds } } },
              { topic: { unit: { subjectId: { in: params.allowedSubjectIds } } } },
            ],
          }
        : {},
    ],
  }

  const lessons = await db.lesson.findMany({
    where,
    include: {
      topic: { include: { unit: { include: { subject: true } } } },
      unit: { include: { subject: true } },
      resources: {
        where: studentLessonResourceWhere(),
        orderBy: [{ role: 'asc' }, { isPrimary: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          role: true,
          isPrimary: true,
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
              creator: true,
              durationSeconds: true,
              language: true,
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
          storageObjectKey: true,
          htmlObjectKey: true,
          outputResource: {
            select: {
              id: true,
              title: true,
              type: true,
              url: true,
              canonicalUrl: true,
            },
          },
        },
      },
    },
    take: 12,
    orderBy: { order: 'asc' },
  })

  // Rank by specificity: topic match > unit match > subject match.
  const score = (l: (typeof lessons)[number]): number => {
    let s = 0
    if (params.lessonId && l.id === params.lessonId) s += 400
    if (params.topicId && l.topicId === params.topicId) s += 200
    if (params.unitNumber && (l.unit?.number === params.unitNumber || l.topic?.unit?.number === params.unitNumber)) s += 120
    if (params.subjectId && (l.unit?.subjectId === params.subjectId || l.topic?.unit?.subjectId === params.subjectId)) s += 80
    if (params.topicTitle && l.topic?.title?.toLowerCase().includes(params.topicTitle.toLowerCase())) s += 100
    if (params.unitTitle && l.unit?.title?.toLowerCase().includes(params.unitTitle.toLowerCase())) s += 50
    if (params.subjectName) {
      const subjName = l.topic?.unit?.subject?.name || l.unit?.subject?.name
      if (subjName?.toLowerCase().includes(params.subjectName.toLowerCase())) s += 10
    }
    return s
  }

  return lessons
    .map((l) => ({ lesson: l, score: score(l) }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.lesson)
}

function containsInsensitive(value: string): Prisma.StringFilter {
  return { contains: value, mode: 'insensitive' }
}

// ============================================================
// Internal: lesson -> chunks
// ============================================================

export function lessonRecordToRetrievedChunks(lesson: LessonContentSource): RetrievedChunk[] {
  const subjectName =
    lesson.topic?.unit?.subject?.name || lesson.unit?.subject?.name
  const unitTitle = lesson.topic?.unit?.title || lesson.unit?.title
  const topicTitle = lesson.topic?.title
  const base = {
    sourceId: lesson.id,
    title: lesson.title,
    subject: subjectName,
    unit: unitTitle,
    topic: topicTitle,
  }

  const chunks: RetrievedChunk[] = []

  // learn mode
  const learn = safeParse<LearnContent>(lesson.learnContent)
  if (learn) {
    if (learn.definition) chunks.push({ ...base, location: 'learn > definition', snippet: learn.definition })
    if (learn.purpose) chunks.push({ ...base, location: 'learn > purpose', snippet: learn.purpose })
    for (const c of learn.coreConcepts || []) {
      chunks.push({
        ...base,
        location: `learn > concept: ${c.title}`,
        snippet: c.explanation,
      })
    }
    if (learn.summary) chunks.push({ ...base, location: 'learn > summary', snippet: learn.summary })
    if (learn.examPoints?.length) {
      chunks.push({
        ...base,
        location: 'learn > examPoints',
        snippet: learn.examPoints.join('; '),
      })
    }
    for (const ex of learn.examples || []) {
      chunks.push({
        ...base,
        location: `learn > example: ${ex.title}`,
        snippet: ex.content,
      })
    }
  }

  // simplify mode
  const simplify = safeParse<SimplifyContent>(lesson.simplifyContent)
  if (simplify) {
    if (simplify.simpleEnglish) chunks.push({ ...base, location: 'simplify > simpleEnglish', snippet: simplify.simpleEnglish })
    if (simplify.analogy) chunks.push({ ...base, location: 'simplify > analogy', snippet: simplify.analogy })
    if (simplify.oneMinuteRecap) chunks.push({ ...base, location: 'simplify > oneMinuteRecap', snippet: simplify.oneMinuteRecap })
  }

  // visualise mode
  const vis = safeParse<VisualiseContent>(lesson.visualiseContent)
  if (vis?.description) {
    chunks.push({ ...base, location: 'visualise > description', snippet: vis.description })
  }

  // practise mode
  const practise = safeParse<PractiseContent>(lesson.practiseContent)
  if (practise) {
    for (const g of practise.guidedExamples || []) {
      chunks.push({
        ...base,
        location: 'practise > guidedExample',
        snippet: `Q: ${g.question}\nA: ${g.solution}`,
      })
    }
  }

  // revise mode
  const revise = safeParse<ReviseContent>(lesson.reviseContent)
  if (revise) {
    if (revise.shortNotes?.length) {
      chunks.push({
        ...base,
        location: 'revise > shortNotes',
        snippet: revise.shortNotes.join('; '),
      })
    }
    for (const d of revise.definitions || []) {
      chunks.push({
        ...base,
        location: `revise > definition: ${d.term}`,
        snippet: d.definition,
      })
    }
    for (const f of revise.formulas || []) {
      chunks.push({
        ...base,
        location: `revise > formula: ${f.name}`,
        snippet: `${f.formula} — ${f.use}`,
      })
    }
  }

  const baseMeta = {
    subject: base.subject,
    unit: base.unit,
    topic: base.topic,
  }
  const resourceChunks = (lesson.resources ?? []).flatMap((item) => lessonResourceToChunks(item, baseMeta))
  const documentChunks = (lesson.generatedDocuments ?? []).map((document) =>
    generatedDocumentToChunk(document, baseMeta),
  )

  // Keep a compact but mixed context: lesson body first, then approved
  // supporting artifacts that can improve grounding without flooding the prompt.
  return [
    ...chunks.slice(0, 5),
    ...resourceChunks.slice(0, 4),
    ...documentChunks.slice(0, 3),
  ].slice(0, 10)
}

function lessonToChunks(lesson: LessonWithRelations): RetrievedChunk[] {
  return lessonRecordToRetrievedChunks(lesson)
}

interface LessonContextSubject {
  name: string
}

interface LessonContextUnit {
  title: string
  subject?: LessonContextSubject | null
}

interface LessonContextTopic {
  title: string
  unit?: LessonContextUnit | null
}

interface LessonResourceContextSource {
  id: string
  role: string
  isPrimary?: boolean
  startSeconds?: number | null
  endSeconds?: number | null
  coveragePercentage?: number | null
  resource: {
    id: string
    title: string
    type: string
    url?: string | null
    canonicalUrl?: string | null
    provider?: string | null
    creator?: string | null
    durationSeconds?: number | null
    language?: string | null
    videoChapters?: Array<{
      id: string
      title: string
      startSeconds: number
      endSeconds?: number | null
      transcriptSnippet?: string | null
    }>
  }
}

interface GeneratedDocumentContextSource {
  id: string
  documentType: string
  version: number
  pageCount?: number | null
  storageObjectKey?: string | null
  htmlObjectKey?: string | null
  outputResource?: {
    id: string
    title: string
    type: string
    url?: string | null
    canonicalUrl?: string | null
  } | null
}

interface LessonContentSource {
  id: string
  title: string
  learnContent?: string | null
  simplifyContent?: string | null
  visualiseContent?: string | null
  practiseContent?: string | null
  reviseContent?: string | null
  topic?: LessonContextTopic | null
  unit?: LessonContextUnit | null
  resources?: LessonResourceContextSource[]
  generatedDocuments?: GeneratedDocumentContextSource[]
}

function lessonResourceToChunks(
  item: LessonResourceContextSource,
  base: Pick<RetrievedChunk, 'subject' | 'unit' | 'topic'>,
): RetrievedChunk[] {
  const resourceTitle = item.resource.title
  const sourceId = `resource:${item.resource.id}`
  const roleLabel = item.role.replace(/_/g, ' ')
  const chunks: RetrievedChunk[] = []
  const details = [
    `Approved ${roleLabel}: ${resourceTitle}`,
    item.resource.creator ? `Creator: ${item.resource.creator}` : '',
    item.resource.provider ? `Provider: ${item.resource.provider}` : '',
    item.resource.durationSeconds ? `Duration: ${Math.round(item.resource.durationSeconds / 60)} min` : '',
    item.coveragePercentage != null ? `Lesson coverage: ${item.coveragePercentage}%` : '',
  ].filter(Boolean)

  chunks.push({
    sourceId,
    title: resourceTitle,
    ...base,
    location: `resource > ${item.role}`,
    snippet: `${details.join('. ')}.`,
  })

  for (const chapter of item.resource.videoChapters ?? []) {
    if (!chapter.transcriptSnippet?.trim()) continue
    chunks.push({
      sourceId,
      title: resourceTitle,
      ...base,
      location: `resource > chapter: ${chapter.title}`,
      snippet: `${formatTimestamp(chapter.startSeconds)} ${chapter.title}: ${chapter.transcriptSnippet.trim()}`,
    })
  }

  return chunks
}

function generatedDocumentToChunk(
  document: GeneratedDocumentContextSource,
  base: Pick<RetrievedChunk, 'subject' | 'unit' | 'topic'>,
): RetrievedChunk {
  const title = document.outputResource?.title ?? documentTitle(document.documentType)
  const delivery = document.outputResource
    ? `approved output resource: ${document.outputResource.title}`
    : document.htmlObjectKey
      ? 'approved HTML artifact'
      : 'approved storage artifact'
  const pageInfo = document.pageCount ? `${document.pageCount} page(s)` : 'page count unavailable'

  return {
    sourceId: `generated-document:${document.id}`,
    title,
    ...base,
    location: `generated document > ${document.documentType}`,
    snippet: `Approved ${documentTitle(document.documentType)} (${delivery}), version ${document.version}, ${pageInfo}.`,
  }
}

function groupChunksBySource(chunks: RetrievedChunk[]): RetrievedSourceGroup[] {
  const groups: RetrievedSourceGroup[] = []
  const bySource = new Map<string, RetrievedSourceGroup>()

  for (const chunk of chunks) {
    let group = bySource.get(chunk.sourceId)
    if (!group) {
      group = {
        sourceId: chunk.sourceId,
        title: chunk.title,
        subject: chunk.subject,
        unit: chunk.unit,
        topic: chunk.topic,
        snippets: [],
      }
      bySource.set(chunk.sourceId, group)
      groups.push(group)
    }

    if (group.snippets.length < 3) {
      group.snippets.push({
        location: chunk.location,
        snippet: truncate(chunk.snippet, 500),
      })
    }
  }

  return groups
}

function documentTitle(type: string): string {
  return type.replace(/_/g, ' ')
}

function formatTimestamp(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safeSeconds / 60)
  const remainder = safeSeconds % 60
  return `${minutes}:${String(remainder).padStart(2, '0')}`
}

function safeParse<T>(s: string | null | undefined): T | null {
  if (!s) return null
  try {
    return JSON.parse(s) as T
  } catch {
    return null
  }
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max - 1).trimEnd() + '…'
}

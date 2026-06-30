import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, CheckCircle2, FileJson2, Link2, Rocket, ShieldCheck, Video } from 'lucide-react'
import type {
  CandidateMappingStatus,
  YouTubeCandidateReviewItem,
  YouTubeCandidateReviewQueue,
  YouTubeCandidateSubjectMapping,
} from '@/lib/resources/youtube-candidate-review'
import { CampusmateAdminShell } from '@/components/admin/campusmate-admin-shell'
import { ApiError } from '@/lib/auth'
import {
  matchesLearningOpsReportScope,
  requireLearningOpsPreviewAccess,
  type LearningOpsReportScope,
} from '@/lib/learning/learning-ops-authority'
import { assertCanPromoteYouTubeCandidates } from '@/lib/resources/youtube-candidate-promotion-access'
import { promoteYouTubeCandidateMappings } from '@/lib/resources/youtube-candidate-promotion'
import { listLessonResourceMappingOptions } from '@/lib/resources/resource-governance'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export const metadata: Metadata = { title: 'YouTube Candidate Review' }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

const reviewQueuePath = join(
  process.cwd(),
  'content',
  'resources',
  'youtube-candidates',
  'cwit-r23-youtube-candidate-review-queue.json',
)

async function validateCandidatePromotion(formData: FormData) {
  'use server'
  await runCandidatePromotion(formData, true)
}

async function writeCandidatePromotion(formData: FormData) {
  'use server'
  await runCandidatePromotion(formData, false)
}

export default async function AdminYouTubeCandidatesPage({ searchParams }: { searchParams?: SearchParams }) {
  const access = await requireLearningOpsPreviewAccess()
  const queue = filterReviewQueueForScope(loadReviewQueue(), access.reportScope)
  const hasReadyMappings =
    queue?.items.some((item) =>
      item.subjectMappings.some((mapping) => mapping.mappingStatus === 'ready_for_lesson_mapping_review'),
    ) ?? false
  const lessonOptions = hasReadyMappings ? await listLessonResourceMappingOptions({ subjectIds: access.subjectIds }) : []
  const flash = promotionFlash(await searchParams)

  return (
    <CampusmateAdminShell user={{ name: access.authority.user.name, email: access.authority.user.email }}>
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm lg:p-8">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary">
            <ShieldCheck className="h-4 w-4" />
            Resource Governance
          </div>
          <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">YouTube Candidate Review</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Inspect curated PDF lecture links before they become Resource or LessonResource rows. Draft rows stay
            blocked until metadata, syllabus fit, lesson mapping and reviewer approval are complete.
          </p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{access.summary}</p>
        </section>

        {flash ? <PromotionFlashAlert flash={flash} /> : null}
        {queue ? <ReviewQueueView queue={queue} lessonOptions={lessonOptions} /> : <MissingQueue />}
      </div>
    </CampusmateAdminShell>
  )
}

function ReviewQueueView({
  queue,
  lessonOptions,
}: {
  queue: YouTubeCandidateReviewQueue
  lessonOptions: readonly LessonMappingOption[]
}) {
  const visibleItems = queue.items.slice(0, 80)
  const readyMappings = promotionReadyMappings(queue)

  return (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Video}
          label="Candidates"
          value={queue.totals.candidates}
          detail={`${queue.totals.videos} videos, ${queue.totals.playlists} playlists`}
        />
        <MetricCard
          icon={Link2}
          label="Subject Mappings"
          value={queue.totals.subjectMappings}
          detail={`${queue.totals.readyForLessonMappingReview} ready for lesson mapping review`}
        />
        <MetricCard
          icon={AlertTriangle}
          label="Blocked"
          value={
            queue.totals.blockedMissingLessonStructure +
            queue.totals.blockedUnplacedOfficialSubject +
            queue.totals.blockedMissingManifestSubject
          }
          detail={`${queue.totals.blockedUnplacedOfficialSubject} unplaced official subject mappings`}
        />
        <MetricCard
          icon={FileJson2}
          label="Metadata"
          value={queue.totals.oembedFound}
          detail={`${queue.totals.embeddableCandidates} embeddable candidates found`}
        />
      </section>

      <PromotionReadyPanel readyMappings={readyMappings} lessonOptions={lessonOptions} />

      <Card surface="panel">
        <CardHeader>
          <CardTitle>Draft Candidate Queue</CardTitle>
          <CardDescription>
            Generated {new Date(queue.generatedAt).toLocaleString()}. Showing {visibleItems.length} of {queue.items.length}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resource</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Metadata</TableHead>
                <TableHead>Subject Mapping</TableHead>
                <TableHead>Review Required</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleItems.map((item) => (
                <TableRow key={item.candidateId}>
                  <TableCell className="max-w-md whitespace-normal">
                    <div className="font-medium">{item.title ?? item.subjectMappings[0]?.subjectName ?? item.candidateId}</div>
                    <a
                      href={item.canonicalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all text-xs text-primary underline-offset-2 hover:underline"
                    >
                      {item.canonicalUrl}
                    </a>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {item.sourceEvidence.sourceId}, page {item.sourceEvidence.sourcePage ?? 'unknown'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{item.role}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <div>{item.metadataStatus}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.channel ?? item.availabilityStatus}
                    </div>
                  </TableCell>
                  <TableCell className="min-w-64 whitespace-normal">
                    <div className="grid gap-2">
                      {item.subjectMappings.map((mapping) => (
                        <div key={`${item.candidateId}-${mapping.subjectCode}-${mapping.programmeCode ?? 'missing'}`}>
                          <StatusBadge status={mapping.mappingStatus} />
                          <div className="mt-1 text-xs text-muted-foreground">
                            {mapping.programmeCode ?? 'unmapped'} Sem {mapping.semesterNumber ?? '?'} / {mapping.subjectCode}
                          </div>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-sm whitespace-normal text-xs text-muted-foreground">
                    {item.reviewRequired.length > 0 ? item.reviewRequired.join(' ') : 'Ready for reviewer mapping.'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}

function PromotionReadyPanel({
  readyMappings,
  lessonOptions,
}: {
  readyMappings: readonly PromotionReadyMapping[]
  lessonOptions: readonly LessonMappingOption[]
}) {
  const visibleMappings = readyMappings.slice(0, 25)

  return (
    <Card surface="panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-primary" />
          Promotion Handoff
        </CardTitle>
        <CardDescription>
          {readyMappings.length} candidate mapping{readyMappings.length === 1 ? '' : 's'} can be validated against
          database lessons before writing Resource and LessonResource rows.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {visibleMappings.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Lesson Promotion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleMappings.map(({ item, mapping }) => {
                const lessons = lessonOptionsForSubject(lessonOptions, mapping.subjectCode)
                return (
                  <TableRow key={`${item.candidateId}-${mapping.subjectCode}`}>
                    <TableCell className="max-w-md whitespace-normal">
                      <div className="font-medium">{item.title ?? item.candidateId}</div>
                      <a
                        href={item.canonicalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="break-all text-xs text-primary underline-offset-2 hover:underline"
                      >
                        {item.canonicalUrl}
                      </a>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="secondary">{item.resourceKind}</Badge>
                        <Badge variant={item.embeddable ? 'default' : 'secondary'}>
                          {item.embeddable ? 'embeddable' : item.metadataStatus}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <div className="font-medium">{mapping.subjectCode}</div>
                      <div className="text-xs text-muted-foreground">
                        {mapping.programmeCode ?? 'unmapped'} Sem {mapping.semesterNumber ?? '?'}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[420px] whitespace-normal">
                      {lessons.length > 0 ? (
                        <PromotionForm item={item} mapping={mapping} lessons={lessons} />
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          No database lessons are available for this reviewed subject scope yet.
                        </p>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="rounded-lg border border-dashed border-border/80 p-6 text-sm text-muted-foreground">
            No YouTube mappings are promotion-ready yet. Current blockers remain visible in the draft queue below.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PromotionForm({
  item,
  mapping,
  lessons,
}: {
  item: YouTubeCandidateReviewItem
  mapping: YouTubeCandidateSubjectMapping
  lessons: readonly LessonMappingOption[]
}) {
  return (
    <form className="grid gap-3">
      <input type="hidden" name="candidateId" value={item.candidateId} />
      <input type="hidden" name="subjectCode" value={mapping.subjectCode} />

      <div className="grid gap-2 md:grid-cols-2">
        <Field label="Lesson">
          <select name="lessonId" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" required>
            {lessons.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                {lessonOptionLabel(lesson)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Role">
          <select
            name="role"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            defaultValue={item.role}
          >
            {PROMOTION_ROLE_OPTIONS.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_110px_110px]">
        <Field label="Decision">
          <select name="decision" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" defaultValue="draft">
            <option value="draft">Draft</option>
            <option value="approve">Approve</option>
          </select>
        </Field>
        <Field label="Sort">
          <Input name="sortOrder" type="number" min={0} max={1000} defaultValue={0} />
        </Field>
        <Field label="Coverage">
          <Input name="coveragePercentage" type="number" min={1} max={100} placeholder="%" />
        </Field>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <Field label="Start">
          <Input name="startSeconds" type="number" min={0} placeholder="Seconds" />
        </Field>
        <Field label="End">
          <Input name="endSeconds" type="number" min={0} placeholder="Seconds" />
        </Field>
        <Field label="Language">
          <Input name="language" defaultValue="en" minLength={2} maxLength={16} />
        </Field>
      </div>

      <Field label="Title override">
        <Input name="title" placeholder={item.title ?? `${mapping.subjectCode} YouTube video`} />
      </Field>
      <Field label="Reviewer evidence">
        <Textarea
          name="sourceEvidence"
          placeholder={`Source ${item.sourceEvidence.sourceId}, page ${item.sourceEvidence.sourcePage ?? 'unknown'}`}
        />
      </Field>
      <Label className="flex items-center gap-2 text-sm">
        <input name="isRequired" type="checkbox" className="h-4 w-4 rounded border-input" />
        Required lesson resource
      </Label>
      <div className="flex flex-wrap gap-2">
        <Button formAction={validateCandidatePromotion} type="submit" variant="outline" size="sm">
          Validate
        </Button>
        <Button formAction={writeCandidatePromotion} type="submit" size="sm">
          Promote
        </Button>
      </div>
    </form>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon
  label: string
  value: string | number
  detail: string
}) {
  return (
    <Card surface="panel">
      <CardHeader className="pb-2">
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl font-black">{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{detail}</CardContent>
    </Card>
  )
}

function PromotionFlashAlert({
  flash,
}: {
  flash: { status: 'success' | 'error'; title: string; detail: string }
}) {
  return (
    <Alert variant={flash.status === 'error' ? 'destructive' : 'default'}>
      {flash.status === 'error' ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
      <AlertTitle>{flash.title}</AlertTitle>
      <AlertDescription>{flash.detail}</AlertDescription>
    </Alert>
  )
}

function StatusBadge({ status }: { status: CandidateMappingStatus }) {
  if (status === 'ready_for_lesson_mapping_review') {
    return <Badge variant="default">ready</Badge>
  }
  if (status === 'blocked_missing_manifest_subject') {
    return <Badge variant="destructive">missing subject</Badge>
  }
  if (status === 'blocked_unplaced_official_subject') {
    return <Badge variant="secondary">unplaced official</Badge>
  }
  return <Badge variant="secondary">needs lessons</Badge>
}

type LessonMappingOption = Awaited<ReturnType<typeof listLessonResourceMappingOptions>>[number]

interface PromotionReadyMapping {
  item: YouTubeCandidateReviewItem
  mapping: YouTubeCandidateSubjectMapping
}

const PROMOTION_ROLE_OPTIONS = [
  { value: 'primary_video', label: 'Primary video' },
  { value: 'alternate_video', label: 'Alternate video' },
  { value: 'lesson_notes', label: 'Lesson notes' },
  { value: 'transcript', label: 'Transcript' },
  { value: 'infographic', label: 'Infographic' },
  { value: 'worksheet', label: 'Worksheet' },
  { value: 'formula_sheet', label: 'Formula sheet' },
  { value: 'lab_demo', label: 'Lab demo' },
  { value: 'reference', label: 'Reference' },
] as const

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Label className="grid gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </Label>
  )
}

function MissingQueue() {
  return (
    <Card surface="elevated">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          Review queue missing
        </CardTitle>
        <CardDescription>
          Run npm run resources:youtube:review-queue to generate the draft YouTube candidate review queue.
        </CardDescription>
      </CardHeader>
    </Card>
  )
}

async function runCandidatePromotion(formData: FormData, dryRun: boolean) {
  const candidateId = clean(formData.get('candidateId')) ?? 'unknown'
  const subjectCode = clean(formData.get('subjectCode')) ?? 'unknown'
  let target: string

  try {
    if (candidateId === 'unknown' || subjectCode === 'unknown') {
      throw new ApiError('VALIDATION_ERROR', 'Candidate id and subject code are required.', 400, false)
    }

    const access = await requireLearningOpsPreviewAccess()
    assertCanPromoteYouTubeCandidates(access)
    const reviewQueue = loadReviewQueue()
    if (!reviewQueue) {
      throw new ApiError('NOT_FOUND', 'The YouTube candidate review queue has not been generated.', 404, false)
    }

    const result = await promoteYouTubeCandidateMappings({
      reviewQueue,
      decisions: {
        decisions: [promotionDecisionFromForm(formData)],
      },
      actorUserId: access.authority.user.id,
      allowedSubjectIds: access.subjectIds,
      dryRun,
    })
    const promoted = result.promoted[0]
    revalidatePath('/admin/resources/youtube-candidates')
    target = promotionRedirectUrl({
      status: dryRun ? 'validated' : 'promoted',
      candidateId: promoted?.candidateId ?? candidateId,
      subjectCode: promoted?.subjectCode ?? subjectCode,
    })
  } catch (error) {
    target = promotionRedirectUrl({
      status: 'error',
      candidateId,
      subjectCode,
      message: safeActionErrorMessage(error),
    })
  }

  redirect(target)
}

function promotionDecisionFromForm(formData: FormData) {
  return {
    candidateId: requiredFormValue(formData, 'candidateId'),
    subjectCode: requiredFormValue(formData, 'subjectCode'),
    lessonId: requiredFormValue(formData, 'lessonId'),
    role: clean(formData.get('role')) ?? undefined,
    decision: clean(formData.get('decision')) ?? 'draft',
    sortOrder: integerOrDefault(formData.get('sortOrder'), 0),
    isRequired: formData.get('isRequired') === 'on',
    startSeconds: numericOrNull(formData.get('startSeconds')),
    endSeconds: numericOrNull(formData.get('endSeconds')),
    coveragePercentage: numericOrNull(formData.get('coveragePercentage')),
    sourceEvidence: clean(formData.get('sourceEvidence')),
    title: clean(formData.get('title')),
    language: clean(formData.get('language')) ?? 'en',
  }
}

function loadReviewQueue(): YouTubeCandidateReviewQueue | null {
  if (!existsSync(reviewQueuePath)) return null
  return JSON.parse(readFileSync(reviewQueuePath, 'utf8')) as YouTubeCandidateReviewQueue
}

function filterReviewQueueForScope(
  queue: YouTubeCandidateReviewQueue | null,
  scope: LearningOpsReportScope,
): YouTubeCandidateReviewQueue | null {
  if (!queue || scope.all) return queue

  const items = queue.items.flatMap((item) => {
    const subjectMappings = item.subjectMappings.filter((mapping) =>
      matchesLearningOpsReportScope(scope, {
        departmentCode: mapping.departmentCode,
        programmeCode: mapping.programmeCode,
        subjectCode: mapping.subjectCode,
      }),
    )
    const candidateMatches = matchesLearningOpsReportScope(scope, {
      officialSubjectCodes: item.officialSubjectCodes,
      programmeCodes: item.programmeCodes,
    })

    if (!candidateMatches && subjectMappings.length === 0) return []
    return [{ ...item, subjectMappings }]
  })

  return {
    ...queue,
    totals: totalsForItems(items),
    items,
  }
}

function totalsForItems(items: readonly YouTubeCandidateReviewItem[]): YouTubeCandidateReviewQueue['totals'] {
  const subjectMappings = items.flatMap((item) => item.subjectMappings)
  return {
    candidates: items.length,
    videos: items.filter((item) => item.resourceKind === 'video').length,
    playlists: items.filter((item) => item.resourceKind === 'playlist').length,
    subjectMappings: subjectMappings.length,
    readyForLessonMappingReview: subjectMappings.filter((mapping) => mapping.mappingStatus === 'ready_for_lesson_mapping_review').length,
    blockedMissingManifestSubject: subjectMappings.filter((mapping) => mapping.mappingStatus === 'blocked_missing_manifest_subject').length,
    blockedUnplacedOfficialSubject: subjectMappings.filter((mapping) => mapping.mappingStatus === 'blocked_unplaced_official_subject').length,
    blockedMissingLessonStructure: subjectMappings.filter((mapping) => mapping.mappingStatus === 'blocked_missing_lesson_structure').length,
    oembedFound: items.filter((item) => item.metadataStatus === 'found').length,
    playlistRequiresManualOrApiReview: items.filter((item) => item.resourceKind === 'playlist').length,
    embeddableCandidates: items.filter((item) => item.embeddable === true).length,
    draftOnly: items.length,
  }
}

function promotionReadyMappings(queue: YouTubeCandidateReviewQueue): PromotionReadyMapping[] {
  return queue.items.flatMap((item) =>
    item.subjectMappings
      .filter((mapping) => mapping.mappingStatus === 'ready_for_lesson_mapping_review')
      .map((mapping) => ({ item, mapping })),
  )
}

function lessonOptionsForSubject(lessons: readonly LessonMappingOption[], subjectCode: string) {
  const normalizedSubjectCode = subjectCode.trim().toUpperCase()
  return lessons.filter((lesson) => lessonOptionSubjectCode(lesson) === normalizedSubjectCode)
}

function lessonOptionSubjectCode(lesson: LessonMappingOption) {
  return (lesson.unit?.subject.code ?? lesson.topic?.unit.subject.code ?? '').trim().toUpperCase()
}

function lessonOptionLabel(lesson: LessonMappingOption) {
  const unit = lesson.unit ?? lesson.topic?.unit ?? null
  const subject = unit?.subject.code ?? 'Subject'
  const unitLabel = unit ? `Unit ${unit.number}` : 'No unit'
  const topic = lesson.topic?.title ? ` / ${lesson.topic.title}` : ''
  const status = lesson.status ? ` / ${lesson.status}` : ''
  return `${subject} / ${unitLabel}${topic} / ${lesson.title}${status}`
}

function promotionFlash(searchParams: Record<string, string | string[] | undefined> | undefined) {
  const status = firstQueryValue(searchParams?.promotion)
  const candidateId = firstQueryValue(searchParams?.candidate)
  const subjectCode = firstQueryValue(searchParams?.subject)
  const suffix = [candidateId, subjectCode].filter(Boolean).join(' / ')

  if (status === 'validated') {
    return {
      status: 'success' as const,
      title: 'Promotion validated',
      detail: suffix ? `Candidate ${suffix} passed all write-path checks.` : 'Candidate passed all write-path checks.',
    }
  }
  if (status === 'promoted') {
    return {
      status: 'success' as const,
      title: 'Candidate promoted',
      detail: suffix
        ? `Candidate ${suffix} was written to Resource and LessonResource governance.`
        : 'Candidate was written to Resource and LessonResource governance.',
    }
  }
  if (status === 'error') {
    return {
      status: 'error' as const,
      title: 'Promotion blocked',
      detail: firstQueryValue(searchParams?.message) ?? 'The candidate could not be promoted.',
    }
  }
  return null
}

function promotionRedirectUrl(input: {
  status: 'validated' | 'promoted' | 'error'
  candidateId: string
  subjectCode: string
  message?: string
}) {
  const params = new URLSearchParams({
    promotion: input.status,
    candidate: input.candidateId,
    subject: input.subjectCode,
  })
  if (input.message) params.set('message', input.message)
  return `/admin/resources/youtube-candidates?${params.toString()}`
}

function safeActionErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.safeMessage
  return 'The candidate could not be promoted. Please validate the form values and try again.'
}

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function requiredFormValue(formData: FormData, key: string) {
  const value = clean(formData.get(key))
  if (!value) throw new ApiError('VALIDATION_ERROR', `${key} is required.`, 400, false)
  return value
}

function integerOrDefault(value: FormDataEntryValue | null, fallback: number) {
  const text = String(value ?? '').trim()
  if (!text) return fallback
  const number = Number(text)
  return Number.isInteger(number) ? number : fallback
}

function numericOrNull(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim()
  if (!text) return null
  const number = Number(text)
  return Number.isFinite(number) ? number : null
}

function clean(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim()
  return text ? text : null
}

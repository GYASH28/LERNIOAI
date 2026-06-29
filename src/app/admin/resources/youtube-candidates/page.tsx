import type { Metadata } from 'next'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, FileJson2, Link2, ShieldCheck, Video } from 'lucide-react'
import type {
  CandidateMappingStatus,
  YouTubeCandidateReviewItem,
  YouTubeCandidateReviewQueue,
} from '@/lib/resources/youtube-candidate-review'
import { CampusmateAdminShell } from '@/components/admin/campusmate-admin-shell'
import {
  matchesLearningOpsReportScope,
  requireLearningOpsPreviewAccess,
  type LearningOpsReportScope,
} from '@/lib/learning/learning-ops-authority'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export const metadata: Metadata = { title: 'YouTube Candidate Review' }

const reviewQueuePath = join(
  process.cwd(),
  'content',
  'resources',
  'youtube-candidates',
  'cwit-r23-youtube-candidate-review-queue.json',
)

export default async function AdminYouTubeCandidatesPage() {
  const access = await requireLearningOpsPreviewAccess()
  const queue = filterReviewQueueForScope(loadReviewQueue(), access.reportScope)

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

        {queue ? <ReviewQueueView queue={queue} /> : <MissingQueue />}
      </div>
    </CampusmateAdminShell>
  )
}

function ReviewQueueView({ queue }: { queue: YouTubeCandidateReviewQueue }) {
  const visibleItems = queue.items.slice(0, 80)

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

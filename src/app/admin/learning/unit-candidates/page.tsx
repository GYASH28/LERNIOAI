import type { Metadata } from 'next'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, BookOpenCheck, FileJson2, ListChecks, ShieldCheck } from 'lucide-react'
import { requireActiveRole } from '@/lib/auth'
import type {
  OfficialUnitCandidateReviewQueue,
  UnitCandidateReviewStatus,
} from '@/lib/curriculum/unit-candidate-review'
import { CampusmateAdminShell } from '@/components/admin/campusmate-admin-shell'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export const metadata: Metadata = { title: 'Official Unit Candidate Review' }

const queuePath = join(
  process.cwd(),
  'content',
  'curriculum',
  'cwit-r23',
  'extraction-reports',
  'official-unit-candidate-review-queue.json',
)

export default async function AdminUnitCandidatesPage() {
  const authority = await requireActiveRole('admin')
  const queue = loadQueue()

  return (
    <CampusmateAdminShell user={{ name: authority.user.name, email: authority.user.email }}>
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm lg:p-8">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary">
            <ShieldCheck className="h-4 w-4" />
            Learning OS
          </div>
          <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Official Unit Candidate Review</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Inspect official PDF unit-title extraction blockers before any unit, topic or lesson structure is promoted
            into curriculum manifests.
          </p>
        </section>

        {queue ? <UnitQueueView queue={queue} /> : <MissingQueue />}
      </div>
    </CampusmateAdminShell>
  )
}

function UnitQueueView({ queue }: { queue: OfficialUnitCandidateReviewQueue }) {
  const visibleItems = queue.items.slice(0, 80)

  return (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={BookOpenCheck}
          label="Subjects"
          value={queue.totals.subjects}
          detail={`${queue.totals.subjectsWithUnitCandidates} with unit candidates`}
        />
        <MetricCard
          icon={ListChecks}
          label="Ready"
          value={queue.totals.readyForUnitPromotionReview}
          detail="Still requires reviewer comparison with official pages"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Manual Review"
          value={queue.totals.needsManualUnitReview}
          detail="Candidates found but blocked by quality gates"
        />
        <MetricCard
          icon={FileJson2}
          label="No Candidates"
          value={queue.totals.blockedMissingCourseBlock + queue.totals.blockedNoUnitCandidates}
          detail={`${queue.totals.blockedMissingCourseBlock} missing course block`}
        />
      </section>

      <Card surface="panel">
        <CardHeader>
          <CardTitle>Draft Unit Candidate Queue</CardTitle>
          <CardDescription>
            Generated {new Date(queue.generatedAt).toLocaleString()}. Showing {visibleItems.length} of {queue.items.length}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Candidate Units</TableHead>
                <TableHead>Review Required</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleItems.map((item) => (
                <TableRow key={`${item.programmeCode}-${item.officialSubjectCode}`}>
                  <TableCell className="max-w-sm whitespace-normal">
                    <div className="font-semibold">{item.subjectName}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.programmeCode} Sem {item.semesterNumber} / {item.officialSubjectCode}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Pages {item.sourcePages.length > 0 ? item.sourcePages.join(', ') : 'missing'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={item.reviewStatus} />
                  </TableCell>
                  <TableCell className="max-w-md whitespace-normal text-sm">
                    {item.candidateUnits.length > 0
                      ? item.candidateUnits.map((unit) => `${unit.order}. ${unit.title}`).join(' / ')
                      : 'No extracted unit titles'}
                  </TableCell>
                  <TableCell className="max-w-md whitespace-normal text-xs text-muted-foreground">
                    {item.reviewRequired.length > 0 ? item.reviewRequired.join(' ') : 'Reviewer comparison required.'}
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

function StatusBadge({ status }: { status: UnitCandidateReviewStatus }) {
  if (status === 'ready_for_unit_promotion_review') {
    return <Badge variant="default">ready</Badge>
  }
  if (status === 'blocked_missing_course_block') {
    return <Badge variant="destructive">missing block</Badge>
  }
  if (status === 'blocked_no_unit_candidates') {
    return <Badge variant="secondary">no units</Badge>
  }
  return <Badge variant="secondary">manual review</Badge>
}

function MissingQueue() {
  return (
    <Card surface="elevated">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          Unit review queue missing
        </CardTitle>
        <CardDescription>
          Run npm run curriculum:unit-review-queue to generate the official unit candidate review queue.
        </CardDescription>
      </CardHeader>
    </Card>
  )
}

function loadQueue(): OfficialUnitCandidateReviewQueue | null {
  if (!existsSync(queuePath)) return null
  return JSON.parse(readFileSync(queuePath, 'utf8')) as OfficialUnitCandidateReviewQueue
}

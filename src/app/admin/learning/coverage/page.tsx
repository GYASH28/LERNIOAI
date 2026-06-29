import type { Metadata } from 'next'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  AlertTriangle,
  BookOpenCheck,
  CalendarClock,
  FileJson2,
  LibraryBig,
  Link2,
  ListChecks,
  ShieldCheck,
} from 'lucide-react'
import type { CoverageTotals, CurriculumCoverageReport, ProgrammeCoverage, SemesterCoverage } from '@/lib/curriculum/coverage-report'
import {
  matchesLearningOpsReportScope,
  requireLearningOpsPreviewAccess,
  type LearningOpsReportScope,
} from '@/lib/learning/learning-ops-authority'
import { CampusmateAdminShell } from '@/components/admin/campusmate-admin-shell'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export const metadata: Metadata = { title: 'Learning Coverage' }

const reportPath = join(process.cwd(), 'content', 'reports', 'cwit-r23-learning-coverage.json')

export default async function AdminLearningCoveragePage() {
  const access = await requireLearningOpsPreviewAccess()
  const report = filterCoverageReportForScope(loadCoverageReport(), access.reportScope)

  return (
    <CampusmateAdminShell user={{ name: access.authority.user.name, email: access.authority.user.email }}>
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm lg:p-8">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary">
            <ShieldCheck className="h-4 w-4" />
            Learning OS
          </div>
          <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Coverage Report</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Review CWIT R23 programme coverage, pending verification, resource health and publication gaps before
            importing or publishing learning content.
          </p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{access.summary}</p>
        </section>

        {report ? <CoverageReportView report={report} /> : <MissingReport />}
      </div>
    </CampusmateAdminShell>
  )
}

function CoverageReportView({ report }: { report: CurriculumCoverageReport }) {
  return (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        <MetricCard
          icon={BookOpenCheck}
          label="Manifests"
          value={`${report.totals.manifestsPresent}/${report.totals.semesters}`}
          detail="Programme semester slots present"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Pending"
          value={report.totals.pendingVerification}
          detail="Curriculum and resource verification items"
        />
        <MetricCard
          icon={Link2}
          label="Link Health"
          value={`${report.totals.linkHealthHealthy}/${report.totals.linkHealthChecked}`}
          detail={`${report.totals.linkHealthUnknown} unknown, ${report.totals.brokenResources} broken`}
        />
        <MetricCard
          icon={FileJson2}
          label="Subjects"
          value={report.totals.subjects}
          detail={`${report.totals.subjectsWithOutcomes} with official outcomes`}
        />
        <MetricCard
          icon={LibraryBig}
          label="Catalog"
          value={report.totals.officialCourseCatalogCourses}
          detail={`${report.totals.officialCourseCatalogUnplacedCourses} official courses unplaced`}
        />
        <MetricCard
          icon={ListChecks}
          label="Unit Review"
          value={report.totals.officialUnitReviewSubjectsWithCandidates}
          detail={`${report.totals.officialUnitReviewReadyForPromotion} ready, ${report.totals.officialUnitReviewBlocked} blocked`}
        />
        <MetricCard
          icon={Link2}
          label="Review Queue"
          value={report.totals.youtubeReviewQueueSubjectMappings}
          detail={`${report.totals.youtubeReviewQueueBlockedMissingLessonStructure} lesson blockers, ${report.totals.youtubeReviewQueueBlockedUnplacedOfficialSubject} unplaced official`}
        />
        <MetricCard
          icon={CalendarClock}
          label="Timetable"
          value={report.totals.officialTimetableEvidenceCodes}
          detail={`${report.totals.officialTimetableEvidenceAppearances} review-only code appearances`}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card surface="panel">
          <CardHeader>
            <CardTitle>Programme Semester Coverage</CardTitle>
            <CardDescription>
              Generated {new Date(report.generatedAt).toLocaleString()} from local manifests and candidate reports.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Programme</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Manifest</TableHead>
                  <TableHead>Subjects</TableHead>
                  <TableHead>Outcomes</TableHead>
                  <TableHead>Units</TableHead>
                  <TableHead>Videos</TableHead>
                  <TableHead>Links</TableHead>
                  <TableHead>Pending</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.programmes.flatMap((programme) => programme.semesters).map((semester) => (
                  <TableRow key={`${semester.programme}-${semester.semester}`}>
                    <TableCell>
                      <div className="font-semibold">{semester.programme}</div>
                      <div className="text-xs text-muted-foreground">{semester.department}</div>
                    </TableCell>
                    <TableCell>Sem {semester.semester}</TableCell>
                    <TableCell>
                      <StatusBadge semester={semester} />
                    </TableCell>
                    <TableCell>{semester.subjects}</TableCell>
                    <TableCell>{semester.subjectsWithOutcomes}</TableCell>
                    <TableCell>{semester.units}</TableCell>
                    <TableCell>{semester.youtubeCandidates}</TableCell>
                    <TableCell>
                      {semester.linkHealthChecked > 0
                        ? `${semester.linkHealthHealthy}/${semester.linkHealthChecked}`
                        : '0'}
                    </TableCell>
                    <TableCell>{semester.pendingVerification}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid content-start gap-6">
          <Card surface="elevated">
            <CardHeader>
              <CardTitle>Publication Readiness</CardTitle>
              <CardDescription>Current reviewed-data readiness from this report.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <ReadinessRow label="Manifest coverage" value={ratio(report.totals.manifestsPresent, report.totals.semesters)} />
              <ReadinessRow label="Official catalog placement" value={ratio(report.totals.officialCourseCatalogManifestSubjectCodes, report.totals.officialCourseCatalogCourses)} />
              <ReadinessRow label="Official outcome coverage" value={ratio(report.totals.subjectsWithOutcomes, report.totals.subjects)} />
              <ReadinessRow label="Official unit promotion readiness" value={ratio(report.totals.officialUnitReviewReadyForPromotion, report.totals.officialUnitReviewSubjects)} />
              <ReadinessRow label="Video mapping review readiness" value={ratio(report.totals.youtubeReviewQueueReadyForLessonMapping, report.totals.youtubeReviewQueueSubjectMappings)} />
              <ReadinessRow label="Timetable publication readiness" value={ratio(report.totals.officialTimetableEvidencePublicationReady, report.totals.officialTimetableEvidenceCodes)} />
              <ReadinessRow label="Link health" value={ratio(report.totals.linkHealthHealthy, report.totals.linkHealthChecked)} />
              <ReadinessRow label="Published video mappings" value={ratio(report.totals.lessonsWithPrimaryVideo, report.totals.lessons)} />
              <ReadinessRow label="Approved PDFs" value={ratio(report.totals.lessonsWithApprovedPdf, report.totals.lessons)} />
              <ReadinessRow label="Practice coverage" value={ratio(report.totals.lessonsWithPractice, report.totals.lessons)} />
            </CardContent>
          </Card>

          <Card surface="panel">
            <CardHeader>
              <CardTitle>Known Gaps</CardTitle>
              <CardDescription>Highest priority blockers before student publication.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-muted-foreground">
              <Gap text="CIOT Semesters 3-6 are missing official semester-placement manifests." />
              <Gap text={`${report.totals.officialCourseCatalogCiotUnplaced} official CIOT course catalog entries are source-backed but unplaced until an official semester manifest is obtained.`} />
              <Gap text="Winter 2025 timetable evidence is review-only and cannot publish CIOT semester placement." />
              <Gap text="Official unit candidates exist for 27 subjects, but 0 are ready for promotion without manual review." />
              <Gap text="YouTube candidate mappings are draft only and currently blocked by missing lesson structure, unplaced official subjects or absent manifest subjects." />
              <Gap text="Approved lesson PDFs and practice links are not present in reviewed coverage yet." />
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof BookOpenCheck
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

function StatusBadge({ semester }: { semester: SemesterCoverage }) {
  if (semester.manifestStatus === 'missing_manifest') {
    return <Badge variant="destructive">missing</Badge>
  }
  if (semester.verificationStatus === 'published') {
    return <Badge variant="default">published</Badge>
  }
  return <Badge variant="secondary">{semester.verificationStatus}</Badge>
}

function ReadinessRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border/70 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  )
}

function Gap({ text }: { text: string }) {
  return (
    <div className="flex gap-2">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
      <span>{text}</span>
    </div>
  )
}

function MissingReport() {
  return (
    <Card surface="elevated">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          Coverage report missing
        </CardTitle>
        <CardDescription>
          Run npm run coverage:learning to generate content/reports/cwit-r23-learning-coverage.json.
        </CardDescription>
      </CardHeader>
    </Card>
  )
}

function loadCoverageReport(): CurriculumCoverageReport | null {
  if (!existsSync(reportPath)) return null
  return JSON.parse(readFileSync(reportPath, 'utf8')) as CurriculumCoverageReport
}

function filterCoverageReportForScope(
  report: CurriculumCoverageReport | null,
  scope: LearningOpsReportScope,
): CurriculumCoverageReport | null {
  if (!report || scope.all) return report

  const programmes = report.programmes
    .map((programme) => ({
      ...programme,
      semesters: programme.semesters.filter((semester) =>
        matchesLearningOpsReportScope(scope, {
          departmentCode: semester.department,
          programmeCode: semester.programme,
          subjectCodes: semester.subjectCodes,
        }),
      ),
    }))
    .filter((programme) => programme.semesters.length > 0)

  return {
    ...report,
    totals: totalsForProgrammes(programmes),
    programmes,
  }
}

function totalsForProgrammes(programmes: readonly ProgrammeCoverage[]): CoverageTotals {
  return programmes.flatMap((programme) => programme.semesters).reduce(addSemester, {
    programmes: programmes.length,
    semesters: 0,
    manifestsPresent: 0,
    subjects: 0,
    subjectsWithUnits: 0,
    subjectsWithOutcomes: 0,
    units: 0,
    topics: 0,
    lessons: 0,
    lessonsWithPrimaryVideo: 0,
    lessonsWithApprovedPdf: 0,
    lessonsWithPractice: 0,
    brokenResources: 0,
    pendingVerification: 0,
    youtubeCandidates: 0,
    youtubeMetadataFound: 0,
    youtubePlaylistsRequireReview: 0,
    youtubeReviewQueueCandidates: 0,
    youtubeReviewQueueSubjectMappings: 0,
    youtubeReviewQueueReadyForLessonMapping: 0,
    youtubeReviewQueueBlockedMissingManifestSubject: 0,
    youtubeReviewQueueBlockedUnplacedOfficialSubject: 0,
    youtubeReviewQueueBlockedMissingLessonStructure: 0,
    linkHealthChecked: 0,
    linkHealthHealthy: 0,
    linkHealthUnknown: 0,
    officialTimetableEvidenceAppearances: 0,
    officialTimetableEvidenceCodes: 0,
    officialTimetableEvidencePublicationReady: 0,
    officialCourseCatalogCourses: 0,
    officialCourseCatalogManifestSubjectCodes: 0,
    officialCourseCatalogUnplacedCourses: 0,
    officialCourseCatalogCompUnplaced: 0,
    officialCourseCatalogCiotUnplaced: 0,
    officialUnitReviewSubjects: 0,
    officialUnitReviewSubjectsWithCandidates: 0,
    officialUnitReviewReadyForPromotion: 0,
    officialUnitReviewNeedsManualReview: 0,
    officialUnitReviewBlocked: 0,
  })
}

function addSemester(totals: CoverageTotals, semester: SemesterCoverage): CoverageTotals {
  return {
    ...totals,
    semesters: totals.semesters + 1,
    manifestsPresent: totals.manifestsPresent + (semester.manifestStatus === 'present' ? 1 : 0),
    subjects: totals.subjects + semester.subjects,
    subjectsWithUnits: totals.subjectsWithUnits + semester.subjectsWithUnits,
    subjectsWithOutcomes: totals.subjectsWithOutcomes + semester.subjectsWithOutcomes,
    units: totals.units + semester.units,
    topics: totals.topics + semester.topics,
    lessons: totals.lessons + semester.lessons,
    lessonsWithPrimaryVideo: totals.lessonsWithPrimaryVideo + semester.lessonsWithPrimaryVideo,
    lessonsWithApprovedPdf: totals.lessonsWithApprovedPdf + semester.lessonsWithApprovedPdf,
    lessonsWithPractice: totals.lessonsWithPractice + semester.lessonsWithPractice,
    brokenResources: totals.brokenResources + semester.brokenResources,
    pendingVerification: totals.pendingVerification + semester.pendingVerification,
    youtubeCandidates: totals.youtubeCandidates + semester.youtubeCandidates,
    youtubeMetadataFound: totals.youtubeMetadataFound + semester.youtubeMetadataFound,
    youtubePlaylistsRequireReview: totals.youtubePlaylistsRequireReview + semester.youtubePlaylistsRequireReview,
    linkHealthChecked: totals.linkHealthChecked + semester.linkHealthChecked,
    linkHealthHealthy: totals.linkHealthHealthy + semester.linkHealthHealthy,
    linkHealthUnknown: totals.linkHealthUnknown + semester.linkHealthUnknown,
  }
}

function ratio(numerator: number, denominator: number): string {
  if (denominator <= 0) return '0%'
  return `${Math.round((numerator / denominator) * 100)}%`
}

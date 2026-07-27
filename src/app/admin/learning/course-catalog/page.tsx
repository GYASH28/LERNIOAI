import type { Metadata } from 'next'
export const dynamic = 'force-dynamic'

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, BookOpenCheck, FileJson2, LibraryBig, ShieldCheck } from 'lucide-react'
import { CampusmateAdminShell } from '@/components/admin/campusmate-admin-shell'
import {
  matchesLearningOpsReportScope,
  requireLearningOpsPreviewAccess,
  type LearningOpsReportScope,
} from '@/lib/learning/learning-ops-authority'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export const metadata: Metadata = { title: 'Official Course Catalog' }

type OfficialCourseCatalogReport = {
  generatedAt: string
  status: 'review_only'
  note: string
  totals: {
    officialCourses: number
    manifestSubjectCodes: number
    unplacedOfficialCourses: number
    compUnplacedOfficialCourses: number
    ciotUnplacedOfficialCourses: number
  }
  catalogEntries: OfficialCourseCatalogEntry[]
  unplacedOfficialCourses: UnplacedOfficialCourse[]
}

type OfficialCourseCatalogEntry = {
  departmentCode: string
  courseCode: string
  courseName: string
  sourcePages: number[]
}

type UnplacedOfficialCourse = OfficialCourseCatalogEntry & {
  placementStatus: 'official_course_unplaced_in_local_manifest'
  publicationStatus: 'blocked_until_official_semester_manifest'
}

const catalogPath = join(
  process.cwd(),
  'content',
  'curriculum',
  'cwit-r23',
  'extraction-reports',
  'official-course-catalog.json',
)

export default async function AdminCourseCatalogPage() {
  const access = await requireLearningOpsPreviewAccess()
  const catalog = filterCatalogForScope(loadCatalog(), access.reportScope)

  return (
    <CampusmateAdminShell user={{ name: access.authority.user.name, email: access.authority.user.email }}>
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm lg:p-8">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary">
            <ShieldCheck className="h-4 w-4" />
            Learning OS
          </div>
          <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Official Course Catalog</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Review official course codes and names extracted from CWIT R23 curriculum PDFs. Catalog entries prove
            source-backed course identity only; they do not assign semester placement.
          </p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{access.summary}</p>
        </section>

        {catalog ? <CatalogView catalog={catalog} /> : <MissingCatalog />}
      </div>
    </CampusmateAdminShell>
  )
}

function CatalogView({ catalog }: { catalog: OfficialCourseCatalogReport }) {
  const unplaced = [...catalog.unplacedOfficialCourses].sort((a, b) => a.courseCode.localeCompare(b.courseCode))

  return (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={LibraryBig}
          label="Official Courses"
          value={catalog.totals.officialCourses}
          detail="Extracted from official curriculum PDF course blocks"
        />
        <MetricCard
          icon={BookOpenCheck}
          label="Manifest Codes"
          value={catalog.totals.manifestSubjectCodes}
          detail="Already present in local reviewed manifests"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Unplaced"
          value={catalog.totals.unplacedOfficialCourses}
          detail="Blocked until official semester placement exists"
        />
        <MetricCard
          icon={FileJson2}
          label="CIOT Unplaced"
          value={catalog.totals.ciotUnplacedOfficialCourses}
          detail={`${catalog.totals.compUnplacedOfficialCourses} COMP courses unplaced`}
        />
      </section>

      <Card surface="panel">
        <CardHeader>
          <CardTitle>Unplaced Official Courses</CardTitle>
          <CardDescription>
            Generated {new Date(catalog.generatedAt).toLocaleString()}. Showing {unplaced.length} course rows.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Source Pages</TableHead>
                <TableHead>Publication Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unplaced.map((course) => (
                <TableRow key={`${course.departmentCode}-${course.courseCode}`}>
                  <TableCell className="max-w-md whitespace-normal">
                    <div className="font-semibold">{course.courseName}</div>
                    <div className="text-xs text-muted-foreground">{course.courseCode}</div>
                  </TableCell>
                  <TableCell>{course.departmentCode}</TableCell>
                  <TableCell>{course.sourcePages.length > 0 ? course.sourcePages.join(', ') : 'missing'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">blocked</Badge>
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

function MissingCatalog() {
  return (
    <Card surface="elevated">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          Course catalog missing
        </CardTitle>
        <CardDescription>
          Run npm run curriculum:extract-catalog to generate the official course catalog report.
        </CardDescription>
      </CardHeader>
    </Card>
  )
}

function loadCatalog(): OfficialCourseCatalogReport | null {
  if (!existsSync(catalogPath)) return null
  return JSON.parse(readFileSync(catalogPath, 'utf8')) as OfficialCourseCatalogReport
}

function filterCatalogForScope(
  catalog: OfficialCourseCatalogReport | null,
  scope: LearningOpsReportScope,
): OfficialCourseCatalogReport | null {
  if (!catalog || scope.all) return catalog

  const catalogEntries = catalog.catalogEntries.filter((entry) =>
    matchesLearningOpsReportScope(scope, {
      departmentCode: entry.departmentCode,
      officialSubjectCode: entry.courseCode,
    }),
  )
  const unplacedOfficialCourses = catalog.unplacedOfficialCourses.filter((entry) =>
    matchesLearningOpsReportScope(scope, {
      departmentCode: entry.departmentCode,
      officialSubjectCode: entry.courseCode,
    }),
  )

  return {
    ...catalog,
    catalogEntries,
    unplacedOfficialCourses,
    totals: {
      officialCourses: catalogEntries.length,
      manifestSubjectCodes: Math.max(0, catalogEntries.length - unplacedOfficialCourses.length),
      unplacedOfficialCourses: unplacedOfficialCourses.length,
      compUnplacedOfficialCourses: unplacedOfficialCourses.filter((entry) => entry.departmentCode === 'COMP').length,
      ciotUnplacedOfficialCourses: unplacedOfficialCourses.filter((entry) => entry.departmentCode === 'CIOT').length,
    },
  }
}

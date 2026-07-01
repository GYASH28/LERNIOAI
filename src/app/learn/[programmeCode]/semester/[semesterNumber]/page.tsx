import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import {
  ArrowLeft,
  BookOpen,
  PlayCircle,
  Target,
  Video,
  TrendingUp,
  Calendar,
  FileText,
  Clock,
  type LucideIcon,
} from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getManifestSubjectsForSemester, type ManifestSubject } from '@/lib/curriculum/manifest-data'


export default async function SemesterLearningPage({
  params,
}: {
  params: Promise<{ programmeCode: string; semesterNumber: string }>
}) {
  const authUser = await getCurrentUser()
  const { programmeCode, semesterNumber } = await params
  if (!authUser) {
    redirect(`/sign-in?callbackUrl=/learn/${programmeCode}/semester/${semesterNumber}`)
  }

  const semester = Number.parseInt(semesterNumber, 10)
  if (!Number.isInteger(semester)) notFound()

  const manifestSubjects = getManifestSubjectsForSemester(programmeCode, semester)
  if (manifestSubjects.length === 0) notFound()

  return <ManifestSemesterView programmeCode={programmeCode} semesterNumber={semester} subjects={manifestSubjects} />
}

// ─── Manifest-based semester view ───────────────────────────────────────────

function ManifestSemesterView({
  programmeCode,
  semesterNumber,
  subjects,
}: {
  programmeCode: string
  semesterNumber: number
  subjects: ManifestSubject[]
}) {
  const totalResources = subjects.reduce((sum, s) => sum + s.resources.length, 0)
  const totalCredits = subjects.reduce((sum, s) => sum + s.credits, 0)
  const programmeName = programmeCode === 'DCIOT' ? 'Diploma in Computer Engineering & IoT' : 'Diploma in Computer Engineering'
  const semesterDescriptions: Record<number, string> = {
    1: 'Foundation semester shared by Computer Engineering and Computer Engineering & IoT.',
    2: 'Shared subjects for CP and CI, plus one CI-only electronics subject.',
    3: 'Core programming, data structures, interfaces and CP/CI branch foundations.',
    4: 'Operating systems, databases, networks, Python/Java and IoT architecture.',
    5: 'Software engineering, advanced development, specialization and project initiation.',
    6: 'Machine learning, AI, testing, management, security/cloud/data electives and capstone.',
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* ─── Hero ─── */}
      <section className="border-b border-border/70 bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <Link href="/learn" className="inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Learn</span>
            <span className="sm:hidden">Back</span>
          </Link>
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                {programmeCode} / R23
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Semester {semesterNumber}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                {programmeName} · {semesterDescriptions[semesterNumber] ?? ''}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3 sm:min-w-[400px]">
              <Metric icon={BookOpen} label="Subjects" value={subjects.length} />
              <Metric icon={Video} label="Videos" value={totalResources} />
              <Metric icon={Target} label="Credits" value={totalCredits} />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">
        {/* ─── My Subjects ─── */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">My Subjects</h2>
            <span className="text-xs text-muted-foreground hidden sm:inline">{subjects.length} subjects · {totalResources} curated lectures</span>
          </div>
          <div className="grid gap-3">
            {subjects.map((subject) => {
              const subjectCode = programmeCode === 'DCIOT' && subject.alternateCode ? subject.alternateCode : subject.code
              return (
                <Link
                  key={subjectCode}
                  href={`/learn/${programmeCode}/semester/${semesterNumber}/subject/${subjectCode}`}
                  className="grid gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-hidden="true" />
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {subjectCode}{subject.category ? ` / ${subject.category}` : ''}
                      </p>
                      {subject.priority === 'critical' && (
                        <span className="rounded bg-red-600/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-600">Critical</span>
                      )}
                      {subject.programmeRestriction && (
                        <span className="rounded bg-blue-600/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-blue-600">{subject.programmeRestriction}</span>
                      )}
                    </div>
                    <h3 className="mt-1 truncate text-base font-semibold tracking-normal sm:text-lg">{subject.name}</h3>
                    <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{subject.coverageFocus}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[200px]">
                    <SubjectMetric label="Credits" value={subject.credits} />
                    <SubjectMetric label="Videos" value={subject.resources.length} />
                    <div className="flex items-center justify-center rounded-md bg-primary/10 px-2 py-2">
                      <PlayCircle className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        {/* ─── Recommended Learning Path ─── */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="text-lg font-semibold">Recommended Learning Path</h2>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground mb-4">
              Follow this order to build your knowledge progressively. Critical subjects first, then important ones.
            </p>
            <div className="space-y-2">
              {subjects
                .sort((a, b) => {
                  const priority: Record<string, number> = { critical: 0, high: 1, critical_for_iot: 2, important: 3, practical: 4, high_priority: 1 }
                  return (priority[a.priority] ?? 5) - (priority[b.priority] ?? 5)
                })
                .slice(0, 5)
                .map((subject, i) => {
                  const subjectCode = programmeCode === 'DCIOT' && subject.alternateCode ? subject.alternateCode : subject.code
                  return (
                    <Link
                      key={subjectCode}
                      href={`/learn/${programmeCode}/semester/${semesterNumber}/subject/${subjectCode}`}
                      className="flex items-center gap-3 rounded-md border border-border/50 p-2.5 transition-colors hover:bg-accent/50"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{subject.name}</span>
                      <span className="hidden text-xs text-muted-foreground sm:inline">{subject.credits} credits</span>
                    </Link>
                  )
                })}
            </div>
          </div>
        </section>

        {/* ─── This Week (placeholder) ─── */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="text-lg font-semibold">This Week</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">Planned Lessons</p>
              </div>
              <p className="mt-2 text-2xl font-bold">3</p>
              <p className="text-xs text-muted-foreground">This week&apos;s target</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">Revision Due</p>
              </div>
              <p className="mt-2 text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">No revisions scheduled</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">Daily Goal</p>
              </div>
              <p className="mt-2 text-2xl font-bold">120 min</p>
              <p className="text-xs text-muted-foreground">2 hours per day</p>
            </div>
          </div>
        </section>

        {/* ─── Semester Resources ─── */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="text-lg font-semibold">Semester Resources</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <a
              href="https://cwit.mespune.org/wp-content/uploads/2021/07/COMPUTER-MPECS-23-CURRICULUM.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/5"
            >
              <FileText className="h-5 w-5 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium">Official Curriculum (COMP)</p>
                <p className="text-xs text-muted-foreground">CWIT R23 Computer Engineering curriculum PDF</p>
              </div>
            </a>
            <a
              href="https://cwit.mespune.org/wp-content/uploads/2023/07/IOTR23_ALL_Curriculam-FINALV.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/5"
            >
              <FileText className="h-5 w-5 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium">Official Curriculum (CIOT)</p>
                <p className="text-xs text-muted-foreground">CWIT R23 Computer Engineering & IoT curriculum PDF</p>
              </div>
            </a>
          </div>
        </section>

        {/* ─── Semester Switcher ─── */}
        <section>
          <h2 className="mb-4 text-lg font-semibold">All Semesters</h2>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {[1, 2, 3, 4, 5, 6].map((sem) => {
              const isActive = sem === semesterNumber
              return (
                <Link
                  key={sem}
                  href={`/learn/${programmeCode}/semester/${sem}`}
                  className={`rounded-lg border p-3 text-center transition-colors sm:p-4 ${
                    isActive
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card hover:border-primary/40 hover:bg-accent/5'
                  }`}
                >
                  <p className="text-xs text-muted-foreground">Sem</p>
                  <p className="mt-1 text-xl font-bold sm:text-2xl">{sem}</p>
                  {isActive && (
                    <p className="mt-1 text-[10px] font-semibold uppercase text-primary">Current</p>
                  )}
                </Link>
              )
            })}
          </div>
        </section>
      </div>
    </main>
  )
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-2 sm:p-3">
      <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
      <p className="mt-1 text-lg font-bold sm:text-xl">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function SubjectMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-muted px-2 py-2">
      <p className="text-sm font-bold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  )
}

import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, BookOpen, PlayCircle, Target, Video, type LucideIcon } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getManifestSubjectsForSemester, type ManifestSubject } from '@/lib/curriculum/manifest-data'

export const dynamic = 'force-dynamic'

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

  // Always use manifest data — it has YouTube video resources
  const manifestSubjects = getManifestSubjectsForSemester(programmeCode, semester)
  if (manifestSubjects.length === 0) notFound()

  return <ManifestSemesterView programmeCode={programmeCode} semesterNumber={semester} subjects={manifestSubjects} />
}

// ─── Manifest-based view ───────────────────────────────────────────────────

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
  const programmeName = programmeCode === 'DCIOT' ? 'Diploma in Computer Engineering & IoT' : 'Diploma in Computer Engineering'

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero */}
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
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{programmeName}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3 sm:min-w-[400px]">
              <Metric icon={BookOpen} label="Subjects" value={subjects.length} />
              <Metric icon={Video} label="Videos" value={totalResources} />
              <Metric icon={Target} label="Scheme" value="R23" />
            </div>
          </div>
        </div>
      </section>

      {/* Subjects list */}
      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">My Subjects</h2>
          <span className="text-xs text-muted-foreground">{subjects.length} subjects · {totalResources} curated lectures</span>
        </div>
        <div className="grid gap-3">
          {subjects.map((subject) => {
            const subjectCode = programmeCode === 'DCIOT' && subject.alternateCode ? subject.alternateCode : subject.code
            const primaryVideo = subject.resources.find((r) => r.role === 'primary_video')
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

      {/* Semester switcher */}
      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
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

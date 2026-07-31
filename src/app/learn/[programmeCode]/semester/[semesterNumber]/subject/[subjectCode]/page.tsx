import Link from 'next/link'
export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import {
  ArrowLeft,
  BookOpen,
  PlayCircle,
  Target,
  Video,
  FileText,
  CheckCircle2,
  Layers,
  GraduationCap,
  ListChecks,
  NotebookPen,
  type LucideIcon,
} from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getManifestSubject, type ManifestSubject } from '@/lib/curriculum/manifest-data'
import { enhanceSubject } from '@/lib/curriculum/enhanced-manifest'
import { getSubjectNotes } from '@/lib/curriculum/lesson-notes-loader'
import { YouTubePlayer } from '@/components/learning/youtube-player-lazy'
import { QuickRevisionHub } from '@/components/learning/quick-revision-hub'


export default async function SubjectLearningPage({
  params,
}: {
  params: Promise<{ programmeCode: string; semesterNumber: string; subjectCode: string }>
}) {
  const authUser = await getCurrentUser()
  const { programmeCode, semesterNumber, subjectCode } = await params
  if (!authUser) {
    redirect(`/sign-in?callbackUrl=/learn/${programmeCode}/semester/${semesterNumber}/subject/${subjectCode}`)
  }

  const semester = Number.parseInt(semesterNumber, 10)
  if (!Number.isInteger(semester)) notFound()

  const manifestSubject = getManifestSubject(programmeCode, semester, subjectCode)
  if (!manifestSubject) notFound()

  const subject = enhanceSubject(manifestSubject)
  const subjectCodeResolved = programmeCode === 'DCIOT' && subject.alternateCode ? subject.alternateCode : subject.code
  const semesterHref = `/learn/${programmeCode}/semester/${semesterNumber}`
  const lessonSlug = subject.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
  const lessonHref = `/learn/${programmeCode}/semester/${semesterNumber}/subject/${subjectCodeResolved}/lesson/${lessonSlug}`

  // ─── V3 Notes lookup ─────────────────────────────────────────────────────
  // If we have rich notes for this subject, use them to drive the unit map
  // (real lesson titles + slugs) instead of the synthetic enhanced-manifest
  // lessons. Falls back to the synthetic units if no notes exist.
  const subjectNotes = getSubjectNotes(subjectCodeResolved)

  const primaryVideos = subject.resources.filter((r) => r.role === 'primary_video')
  const alternateVideos = subject.resources.filter((r) => r.role !== 'primary_video')
  const totalLessons = subjectNotes
    ? subjectNotes.units.reduce((sum, u) => sum + u.lessons.length, 0)
    : subject.units.reduce((sum, u) => sum + u.lessons.length, 0)

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* ─── Hero ─── */}
      <section className="border-b border-border/70 bg-muted/30">
        <div className="mx-auto max-w-6xl px-5 py-6 sm:px-6 lg:px-8">
          <Link href={semesterHref} className="inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Semester {semesterNumber}</span>
            <span className="sm:hidden">Back</span>
          </Link>
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-primary" aria-hidden="true" />
                <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                  {subjectCodeResolved}{subject.category ? ` / ${subject.category}` : ''}
                </p>
                {subject.priority === 'critical' && (
                  <span className="rounded bg-red-600/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-600">Critical</span>
                )}
              </div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{subject.name}</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{subject.description}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:min-w-[320px]">
              <Metric icon={BookOpen} label="Credits" value={subject.credits} />
              <Metric icon={Layers} label="Units" value={subject.units.length} />
              <Metric icon={Video} label="Videos" value={subject.resources.length} />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 py-6 sm:px-6 lg:px-8 space-y-8">
        {/* ─── Course Outcomes ─── */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="text-lg font-semibold">Course Outcomes</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {subject.outcomes.map((outcome, i) => (
              <div key={i} className="flex items-start gap-2 rounded-md border border-border bg-card p-3">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <p className="text-sm text-muted-foreground">{outcome}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Download Notes PDF ─── */}
        {(() => {
          // Compute PDF URL dynamically — matches the Python script's naming
          const safeName = subject.name
            .toLowerCase()
            .replace(/&/g, 'and')
            .replace(/\//g, '-')
            .replace(/[^a-z0-9-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '')
          const pdfUrl = `/lesson-notes/${subjectCodeResolved.toLowerCase()}-${safeName}.pdf`
          return (
            <section>
              <a
                href={pdfUrl}
                download
                className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-3 sm:p-5 transition-colors hover:bg-primary/10"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">Study Material</p>
                  <h2 className="mt-1 text-sm font-semibold sm:text-lg">Download Notes PDF</h2>
                  <p className="mt-1 text-xs text-muted-foreground hidden sm:block sm:text-sm">
                    Complete notes with study guide, YouTube resources, and practice questions
                  </p>
                </div>
                <FileText className="h-5 w-5 shrink-0 text-primary sm:h-8 sm:w-8" aria-hidden="true" />
              </a>
            </section>
          )
        })()}

        {/* ─── Coverage Focus ─── */}
        <section>
          <div className="rounded-lg border border-border bg-card p-4 sm:p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Coverage Focus</h2>
            <p className="mt-2 text-sm text-foreground">{subject.coverageFocus}</p>
          </div>
        </section>

        {/* ─── Assessment Pattern ─── */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="text-lg font-semibold">Assessment Pattern</h2>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">{subject.assessmentPattern}</p>
          </div>
        </section>

        {/* ─── Unit Map ─── */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="text-lg font-semibold">Unit Map</h2>
            <span className="text-xs text-muted-foreground">{totalLessons} lessons</span>
          </div>
          <div className="grid gap-3">
            {/* Use V3 notes units when available; else fall back to enhanced-manifest units */}
            {(subjectNotes ? subjectNotes.units : subject.units).map((unit) => {
              // Type narrow: V3 notes units have weightage + lessons with slug+title+durationMin+difficulty
              const u = unit as {
                number: number
                title: string
                weightage?: number
                description?: string
                lessons: Array<{ slug: string; title: string; durationMin?: number; difficulty?: string }>
              }
              return (
                <div key={u.number} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Unit {u.number}</p>
                      <h3 className="mt-1 text-sm font-semibold sm:text-base">{u.title}</h3>
                      {u.description && (
                        <p className="mt-1 text-xs text-muted-foreground">{u.description}</p>
                      )}
                    </div>
                    {u.weightage !== undefined && (
                      <span className="shrink-0 rounded bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                        {u.weightage}%
                      </span>
                    )}
                  </div>
                  {u.lessons.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {u.lessons.map((lesson) => {
                        // If we have V3 notes, link to the specific lesson page
                        // using the lesson's real slug. Otherwise, link to the
                        // generic subject-level lesson page.
                        const href = subjectNotes
                          ? `/learn/${programmeCode}/semester/${semesterNumber}/subject/${subjectCode}/lesson/${lesson.slug}`
                          : lessonHref
                        return (
                          <Link
                            key={lesson.slug}
                            href={href}
                            className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                          >
                            {lesson.title}
                            {lesson.durationMin && (
                              <span className="ml-1 text-[10px] text-muted-foreground/70">· {lesson.durationMin}m</span>
                            )}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* ─── Quick Revision Hub (moved above videos for faster access) ─── */}
        {(() => {
          const notes = getSubjectNotes(subjectCodeResolved)
          if (notes) return <QuickRevisionHub notes={notes} />
          // No V3 notes yet — show a friendly "coming soon" card with PDF link
          return (
            <section>
              <div className="mb-4 flex items-center gap-2">
                <NotebookPen className="h-5 w-5 text-primary" aria-hidden="true" />
                <h2 className="text-lg font-semibold">Quick Revision Hub</h2>
              </div>
              <div className="rounded-lg border border-dashed border-border bg-card p-6 text-center">
                <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-semibold">Download the PDF summary for this subject</p>
                <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
                  Concise revision material is available with formulas, key concepts, viva &amp; interview questions, and PYQs.
                </p>
                {(() => {
                  const safeName = subject.name.toLowerCase().replace(/&/g, 'and').replace(/\//g, '-').replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '')
                  const pdfUrl = `/lesson-notes/${subjectCodeResolved.toLowerCase()}-${safeName}.pdf`
                  return (
                    <a
                      href={pdfUrl}
                      download
                      className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      <FileText className="h-4 w-4" />
                      Download PDF Summary
                    </a>
                  )
                })()}
              </div>
            </section>
          )
        })()}

        {/* ─── Primary Video Lectures ─── */}
        {primaryVideos.length > 0 && (
          <section>
            <div className="mb-4 flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="text-lg font-semibold">Primary Lecture{primaryVideos.length > 1 ? 's' : ''}</h2>
              <span className="hidden text-xs text-muted-foreground sm:inline">Start here</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {primaryVideos.map((resource, i) => (
                <YouTubePlayer
                  key={i}
                  url={resource.url}
                  title={resource.title}
                  channel={resource.channel}
                  language={resource.language}
                  description={resource.description}
                  isPlaylist={!!resource.playlistId}
                />
              ))}
            </div>
          </section>
        )}

        {/* ─── Alternate Video Lectures ─── */}
        {alternateVideos.length > 0 && (
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Video className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <h2 className="text-lg font-semibold">Alternate Lectures</h2>
              <span className="hidden text-xs text-muted-foreground sm:inline">For deeper understanding</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {alternateVideos.map((resource, i) => (
                <YouTubePlayer
                  key={i}
                  url={resource.url}
                  title={resource.title}
                  channel={resource.channel}
                  language={resource.language}
                  description={resource.description}
                  isPlaylist={!!resource.playlistId}
                />
              ))}
            </div>
          </section>
        )}

        {/* ─── Start Lesson CTA ─── */}
        <section>
          <Link
            href={lessonHref}
            className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-4 sm:p-5 transition-colors hover:bg-primary/10"
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Ready to start?</p>
              <h2 className="mt-1 text-base font-semibold sm:text-lg">Open Lesson: {subject.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground hidden sm:block">Watch lectures, read notes, practise, and track progress</p>
            </div>
            <PlayCircle className="h-6 w-6 shrink-0 text-primary sm:h-8 sm:w-8" aria-hidden="true" />
          </Link>
        </section>

        {/* ─── Study Tools ─── */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="text-lg font-semibold">Study Tools</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link href={`/tutor?subject=${subjectCodeResolved}`} className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                <GraduationCap className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Ask LEO</p>
                <p className="text-xs text-muted-foreground">AI tutor help</p>
              </div>
            </Link>
            <Link href={`/practice?subject=${subjectCodeResolved}`} className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                <ListChecks className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Practice</p>
                <p className="text-xs text-muted-foreground">Quiz questions</p>
              </div>
            </Link>
            <Link href={`/revision?subject=${subjectCodeResolved}`} className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Revision</p>
                <p className="text-xs text-muted-foreground">Flashcards</p>
              </div>
            </Link>
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

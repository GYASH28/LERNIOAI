import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  FileText,
  GraduationCap,
  ListChecks,
  Play,
  Video,
} from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getManifestSubject } from '@/lib/curriculum/manifest-data'
import { buildVideoLearningCatalog } from '@/lib/curriculum/video-learning-catalog'

export const dynamic = 'force-dynamic'

export default async function SubjectLearningPage({
  params,
}: {
  params: Promise<{ programmeCode: string; semesterNumber: string; subjectCode: string }>
}) {
  const authUser = await getCurrentUser()
  const { programmeCode, semesterNumber, subjectCode } = await params
  const callbackUrl = `/learn/${programmeCode}/semester/${semesterNumber}/subject/${subjectCode}`
  if (!authUser) redirect(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`)

  const semester = Number.parseInt(semesterNumber, 10)
  if (!Number.isInteger(semester) || semester < 1 || semester > 6) notFound()

  const subject = getManifestSubject(programmeCode, semester, subjectCode)
  if (!subject) notFound()

  const catalog = buildVideoLearningCatalog(programmeCode, subject)
  const semesterHref = `/learn/${programmeCode}/semester/${semester}`
  const subjectHref = `/learn/${programmeCode}/semester/${semester}/subject/${subjectCode}`
  const firstVideo = catalog.videoLessons[0]
  const firstVideoHref = firstVideo ? `${subjectHref}/lesson/${firstVideo.slug}` : null
  const materialsHref = `/materials?${new URLSearchParams({ subject: catalog.resolvedSubjectCode }).toString()}`
  const tutorHref = `/tutor?${new URLSearchParams({ subject: catalog.resolvedSubjectCode }).toString()}`
  const practiceHref = `/practice?${new URLSearchParams({ subject: catalog.resolvedSubjectCode }).toString()}`

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="border-b border-border/70 bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Link href="/learn" className="font-semibold hover:text-foreground">Learn</Link>
            <span>/</span>
            <Link href={semesterHref} className="inline-flex items-center gap-1 font-semibold hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Semester {semester}
            </Link>
          </div>

          <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-black uppercase tracking-wide text-primary">{catalog.resolvedSubjectCode}</span>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold capitalize text-muted-foreground">{subject.category}</span>
              </div>
              <h1 className="mt-3 max-w-4xl text-3xl font-black tracking-tight sm:text-5xl">{subject.name}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">{subject.description}</p>
              <p className="mt-3 max-w-3xl text-sm leading-6"><strong>Coverage:</strong> {subject.coverageFocus}</p>

              <div className="mt-5 flex flex-wrap gap-2">
                {firstVideoHref ? (
                  <Link href={firstVideoHref} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-primary-foreground">
                    <Play className="h-4 w-4" /> Watch first video lesson
                  </Link>
                ) : null}
                <Link href={materialsHref} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background/80 px-4 py-2.5 text-sm font-bold hover:bg-accent">
                  <FileText className="h-4 w-4" /> Open written notes
                </Link>
                <Link href={tutorHref} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background/80 px-4 py-2.5 text-sm font-bold hover:bg-accent">
                  <BrainCircuit className="h-4 w-4" /> Ask LEO
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[520px]">
              <Metric icon={Video} label="Video lessons" value={catalog.videoLessons.length} />
              <Metric icon={AlertTriangle} label="Need video" value={catalog.pendingTopics.length} />
              <Metric icon={BookOpen} label="Note topics" value={catalog.topics.length} />
              <Metric icon={GraduationCap} label="Credits" value={subject.credits} />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.15em] text-primary">Clear separation</p>
          <h2 className="mt-1 text-2xl font-black">Learn is for videos. Materials is for notes.</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
            Every item labelled as a lesson below has one direct, lesson-specific video. Written explanations, examples, flashcards and complete textbook notes remain in Materials instead of being duplicated inside Learn.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <InfoCard icon={Video} title="Watch" text="One reviewed direct video per lesson. No full playlist used as a fake lesson." />
            <InfoCard icon={BrainCircuit} title="Understand" text="Open LEO with the exact subject and lesson already attached as context." />
            <InfoCard icon={ListChecks} title="Apply" text="Move directly into focused practice after watching the explanation." />
          </div>
        </section>

        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.15em] text-primary">Video lessons</p>
              <h2 className="mt-1 text-2xl font-black">{catalog.videoLessons.length} playable lesson{catalog.videoLessons.length === 1 ? '' : 's'}</h2>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">Direct videos only</span>
          </div>

          {catalog.videoLessons.length > 0 ? (
            <div className="space-y-4">
              {catalog.units.map((unit) => {
                const lessons = unit.topics.filter((topic) => topic.video)
                if (lessons.length === 0) return null
                return (
                  <article key={unit.number} className="overflow-hidden rounded-3xl border border-border bg-card">
                    <div className="flex flex-col gap-3 border-b border-border bg-muted/30 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-primary">Unit {unit.number}</p>
                        <h3 className="mt-1 text-xl font-black">{unit.title}</h3>
                      </div>
                      <span className="rounded-full bg-background px-3 py-1.5 text-xs font-bold">{lessons.length} video lesson{lessons.length === 1 ? '' : 's'}</span>
                    </div>

                    <div className="grid gap-3 p-4 sm:p-5 lg:grid-cols-2">
                      {lessons.map((lesson) => {
                        const video = lesson.video!
                        const href = `${subjectHref}/lesson/${lesson.slug}`
                        const lessonIndex = catalog.videoLessons.findIndex((item) => item.slug === lesson.slug) + 1
                        return (
                          <Link key={lesson.slug} href={href} className="group overflow-hidden rounded-2xl border border-border bg-background transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-sm">
                            <div className="relative aspect-video overflow-hidden bg-muted">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={video.thumbnailUrl} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" loading="lazy" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" />
                              <span className="absolute bottom-3 left-3 grid h-10 w-10 place-items-center rounded-full bg-white text-black shadow-lg"><Play className="h-4 w-4 fill-current" /></span>
                              <span className="absolute bottom-3 right-3 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-bold text-white">Lesson {lessonIndex}</span>
                            </div>
                            <div className="p-4">
                              <p className="text-[10px] font-black uppercase tracking-wide text-primary">Unit {lesson.unitNumber} · Video lesson</p>
                              <h4 className="mt-1 line-clamp-2 font-black leading-tight">{lesson.title}</h4>
                              <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{lesson.overview}</p>
                              <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-muted-foreground">
                                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1"><Clock3 className="h-3 w-3" /> {lesson.durationMin} min study</span>
                                <span className="rounded-full bg-muted px-2 py-1">{video.resource.channel}</span>
                                <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-emerald-700">Direct video</span>
                              </div>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-border bg-muted/20 p-8 text-center">
              <Video className="mx-auto h-9 w-9 text-muted-foreground" />
              <h3 className="mt-3 text-xl font-black">No reviewed video lessons yet</h3>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Lernio will not show a random subject playlist as a lesson. Use Materials and LEO while direct videos are reviewed.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Link href={materialsHref} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"><BookOpen className="h-4 w-4" /> Open Materials</Link>
                <Link href={tutorHref} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-bold"><BrainCircuit className="h-4 w-4" /> Ask LEO</Link>
              </div>
            </div>
          )}
        </section>

        {catalog.pendingTopics.length > 0 ? (
          <section className="rounded-3xl border border-amber-500/25 bg-amber-500/5 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="text-xs font-black uppercase tracking-[0.15em] text-amber-700">Coverage gaps</p>
                <h2 className="mt-1 text-xl font-black">{catalog.pendingTopics.length} topic{catalog.pendingTopics.length === 1 ? '' : 's'} still need a direct video</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">These are curriculum topics, not video lessons yet. They remain available in Materials and LEO without misleading students.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {catalog.pendingTopics.map((topic) => {
                const topicTutorHref = `/tutor?${new URLSearchParams({
                  subject: catalog.resolvedSubjectCode,
                  lesson: topic.title,
                  unitNumber: String(topic.unitNumber),
                }).toString()}`
                const topicMaterialsHref = `/materials?${new URLSearchParams({
                  subject: catalog.resolvedSubjectCode,
                  lesson: topic.slug,
                }).toString()}`
                return (
                  <article key={topic.slug} className="rounded-2xl border border-amber-500/20 bg-background p-4">
                    <p className="text-[10px] font-black uppercase tracking-wide text-amber-700">Unit {topic.unitNumber} · Topic</p>
                    <h3 className="mt-1 font-black">{topic.title}</h3>
                    <div className="mt-3 flex gap-2">
                      <Link href={topicMaterialsHref} className="inline-flex min-h-9 flex-1 items-center justify-center rounded-lg border border-border px-2 text-xs font-bold">Notes</Link>
                      <Link href={topicTutorHref} className="inline-flex min-h-9 flex-1 items-center justify-center rounded-lg bg-primary px-2 text-xs font-bold text-primary-foreground">Ask LEO</Link>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <Link href={materialsHref} className="group rounded-3xl border border-border bg-card p-5 transition hover:border-primary/35">
            <BookOpen className="h-6 w-6 text-primary" />
            <h2 className="mt-3 text-lg font-black">Complete written notes</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Read diagrams, theory, examples, flashcards and revision material in the polished Materials reader.</p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary">Open Materials <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
          </Link>
          <Link href={practiceHref} className="group rounded-3xl border border-border bg-card p-5 transition hover:border-primary/35">
            <ListChecks className="h-6 w-6 text-primary" />
            <h2 className="mt-3 text-lg font-black">Practice this subject</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Check whether the video actually became understanding, not just watch time.</p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary">Start practice <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
          </Link>
          <Link href={tutorHref} className="group rounded-3xl border border-border bg-card p-5 transition hover:border-primary/35">
            <BrainCircuit className="h-6 w-6 text-primary" />
            <h2 className="mt-3 text-lg font-black">Continue with LEO</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Open the rebuilt tutor with this subject already attached as academic context.</p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary">Open tutor <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
          </Link>
        </section>
      </div>
    </main>
  )
}

function Metric({ icon: Icon, label, value }: { icon: typeof Video; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-background/80 p-3">
      <Icon className="h-4 w-4 text-primary" />
      <p className="mt-2 text-xl font-black tabular-nums">{value}</p>
      <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">{label}</p>
    </div>
  )
}

function InfoCard({ icon: Icon, title, text }: { icon: typeof Video; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <Icon className="h-5 w-5 text-primary" />
      <h3 className="mt-3 font-black">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
    </div>
  )
}

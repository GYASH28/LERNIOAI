import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ChevronRight, BookOpen, Clock, BarChart3, Layers } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { TopBar } from '@/components/layout/top-bar'
import { Footer } from '@/components/layout/footer'
import { getSubjectNotes, findLessonBySlug, getAdjacentLessons } from '@/lib/curriculum/lesson-notes-loader'
import { MaterialsLessonRenderer } from '@/components/learning/materials-lesson-renderer'

export const dynamic = 'force-dynamic'

export default async function MaterialsLessonPage({
  params,
}: {
  params: Promise<{ subjectCode: string; lessonSlug: string }>
}) {
  const user = await getCurrentUser()
  if (!user) {
    redirect(`/sign-in?callbackUrl=/materials/lesson/${(await params).subjectCode}/${(await params).lessonSlug}`)
  }

  const { subjectCode, lessonSlug } = await params

  // Look up V3 notes for this subject
  const subjectNotes = getSubjectNotes(subjectCode)
  if (!subjectNotes) {
    notFound()
  }

  // Try to find the specific lesson by slug (fuzzy match)
  const match = findLessonBySlug(subjectCode, lessonSlug)
  if (!match) {
    // If no exact match, try to find the first lesson as fallback
    const firstLesson = subjectNotes.units[0]?.lessons[0]
    if (!firstLesson) notFound()
    // Redirect to the first lesson
    redirect(`/materials/lesson/${subjectCode}/${firstLesson.slug}`)
  }

  const { lesson, unit, subject } = match
  const { prev, next } = getAdjacentLessons(subjectCode, lessonSlug)
  const materialsHref = '/materials'

  // Find all lessons in this subject for the sidebar
  const allLessons: Array<{ slug: string; title: string; unitNumber: number; unitTitle: string }> = []
  for (const u of subjectNotes.units) {
    for (const l of u.lessons) {
      allLessons.push({
        slug: l.slug,
        title: l.title,
        unitNumber: u.number,
        unitTitle: u.title,
      })
    }
  }
  const currentIdx = allLessons.findIndex((l) => l.slug === lesson.slug)

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <TopBar />
      <main className="flex-1 page-wipe">
        {/* ─── Breadcrumbs ─── */}
        <section className="border-b border-border/70 bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Link href={materialsHref} className="inline-flex items-center gap-1 font-medium hover:text-foreground transition-colors">
                <ArrowLeft className="h-3 w-3" />
                Materials
              </Link>
              <ChevronRight className="h-3 w-3" />
              <span className="font-medium">{subject.subjectName}</span>
              <ChevronRight className="h-3 w-3" />
              <span className="font-medium text-foreground">Unit {unit.number}</span>
              <ChevronRight className="h-3 w-3" />
              <span className="truncate font-medium text-foreground">{lesson.title}</span>
            </div>
          </div>
        </section>

        {/* ─── Lesson header ─── */}
        <section className="border-b border-border/70 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  {subject.subjectCode} · Unit {unit.number}: {unit.title}
                </p>
                <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{lesson.title}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {lesson.durationMin} min read
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <BarChart3 className="h-3.5 w-3.5" />
                    <span className="capitalize">{lesson.difficulty}</span>
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5" />
                    Lesson {currentIdx + 1} of {allLessons.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Main content + sidebar ─── */}
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
            {/* Main lesson content */}
            <div className="min-w-0">
              <MaterialsLessonRenderer
                lesson={lesson}
                subject={subjectNotes}
                prevHref={prev ? `/materials/lesson/${subjectCode}/${prev.slug}` : null}
                nextHref={next ? `/materials/lesson/${subjectCode}/${next.slug}` : null}
                prevTitle={prev?.title}
                nextTitle={next?.title}
              />
            </div>

            {/* Sidebar — lesson navigation */}
            <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <BookOpen className="h-4 w-4 text-primary" />
                  All Lessons
                </h3>
                <nav className="space-y-0.5 max-h-96 overflow-y-auto">
                  {allLessons.map((l, i) => {
                    const isActive = l.slug === lesson.slug
                    return (
                      <Link
                        key={l.slug}
                        href={`/materials/lesson/${subjectCode}/${l.slug}`}
                        className={`block rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                          isActive
                            ? 'bg-primary/10 font-semibold text-primary'
                            : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                        }`}
                      >
                        <span className="block truncate">
                          <span className="text-[10px] font-bold opacity-60">U{l.unitNumber}·{i + 1}</span>{' '}
                          {l.title}
                        </span>
                      </Link>
                    )
                  })}
                </nav>
              </div>

              {/* Back to materials */}
              <Link
                href="/materials"
                className="block rounded-lg border border-border bg-card p-3 text-xs font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
              >
                <ArrowLeft className="mr-1.5 inline h-3.5 w-3.5" />
                Back to all subjects
              </Link>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

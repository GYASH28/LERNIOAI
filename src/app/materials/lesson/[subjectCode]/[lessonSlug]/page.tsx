import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ChevronRight, BookOpen, Clock, BarChart3, Layers } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { TopBar } from '@/components/layout/top-bar'
import { Footer } from '@/components/layout/footer'
import { getSubjectNotes, findLessonBySlug, getAdjacentLessons } from '@/lib/curriculum/lesson-notes-loader'
import { PresentationDeck } from '@/components/learning/presentation-deck'

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
  const subjectNotes = getSubjectNotes(subjectCode)
  if (!subjectNotes) notFound()

  const match = findLessonBySlug(subjectCode, lessonSlug)
  if (!match) {
    const firstLesson = subjectNotes.units[0]?.lessons[0]
    if (!firstLesson) notFound()
    redirect(`/materials/lesson/${subjectCode}/${firstLesson.slug}`)
  }

  const { lesson, unit, subject } = match
  const { prev, next } = getAdjacentLessons(subjectCode, lessonSlug)

  const allLessons: Array<{ slug: string; title: string; unitNumber: number }> = []
  for (const u of subjectNotes.units) {
    for (const l of u.lessons) {
      allLessons.push({ slug: l.slug, title: l.title, unitNumber: u.number })
    }
  }
  const currentIdx = allLessons.findIndex((l) => l.slug === lesson.slug)

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <TopBar />
      <main className="flex-1 page-wipe">
        {/* Breadcrumbs */}
        <section className="border-b border-border/70 bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Link href="/materials" className="inline-flex items-center gap-1 font-medium hover:text-foreground transition-colors">
                <ArrowLeft className="h-3 w-3" />Materials
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

        {/* Lesson header */}
        <section className="border-b border-border/70 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {subject.subjectCode} · Unit {unit.number}: {unit.title}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{lesson.durationMin} min</span>
              <span>·</span>
              <span className="flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5" /><span className="capitalize">{lesson.difficulty}</span></span>
              <span>·</span>
              <span className="flex items-center gap-1"><Layers className="h-3.5 w-3.5" />Lesson {currentIdx + 1} of {allLessons.length}</span>
            </div>
          </div>
        </section>

        {/* Presentation Deck */}
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <PresentationDeck
            lesson={lesson}
            subject={subjectNotes}
            prevHref={prev ? `/materials/lesson/${subjectCode}/${prev.slug}` : null}
            nextHref={next ? `/materials/lesson/${subjectCode}/${next.slug}` : null}
            prevTitle={prev?.title}
            nextTitle={next?.title}
          />
        </div>
      </main>
      <Footer />
    </div>
  )
}

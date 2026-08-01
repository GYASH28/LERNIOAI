import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, BarChart3, ChevronRight, Clock3, Layers3 } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { TopBar } from '@/components/layout/top-bar'
import { Footer } from '@/components/layout/footer'
import { getAdjacentLessons, getSubjectNotes } from '@/lib/curriculum/lesson-notes-loader'
import {
  canonicalMaterialsHref,
  resolveMaterialsLesson,
} from '@/lib/curriculum/materials-catalog'
import { MaterialsReadingExperience } from '@/components/learning/materials-reading-experience'

export const dynamic = 'force-dynamic'

export default async function MaterialsLessonPage({
  params,
}: {
  params: Promise<{ subjectCode: string; lessonSlug: string }>
}) {
  const { subjectCode, lessonSlug } = await params
  const callbackUrl = canonicalMaterialsHref(subjectCode, lessonSlug)
  const user = await getCurrentUser()
  if (!user) redirect(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`)

  const match = resolveMaterialsLesson(subjectCode, lessonSlug)
  if (!match) notFound()

  const { lesson, unit, subject } = match
  const canonicalHref = canonicalMaterialsHref(subject.subjectCode, lesson.slug)
  if (callbackUrl !== canonicalHref) redirect(canonicalHref)

  const subjectNotes = getSubjectNotes(subject.subjectCode)
  if (!subjectNotes) notFound()

  const { prev, next } = getAdjacentLessons(subject.subjectCode, lesson.slug)
  const allLessons = subjectNotes.units.flatMap((currentUnit) =>
    currentUnit.lessons.map((currentLesson) => ({
      slug: currentLesson.slug,
      title: currentLesson.title,
      unitNumber: currentUnit.number,
      unitTitle: currentUnit.title,
      durationMin: currentLesson.durationMin,
    })),
  )
  const currentIndex = allLessons.findIndex((item) => item.slug === lesson.slug)
  const prevHref = prev ? canonicalMaterialsHref(subject.subjectCode, prev.slug) : null
  const nextHref = next ? canonicalMaterialsHref(subject.subjectCode, next.slug) : null

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <TopBar />
      <main className="page-wipe flex-1">
        <section className="border-b border-border/70 bg-muted/30">
          <div className="mx-auto max-w-[1500px] px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-2 overflow-hidden text-xs text-muted-foreground">
              <Link
                href={`/materials?subject=${encodeURIComponent(subject.subjectCode)}`}
                className="inline-flex shrink-0 items-center gap-1 font-bold hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Materials
              </Link>
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden shrink-0 font-semibold sm:inline">{subject.subjectName}</span>
              <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 sm:block" />
              <span className="shrink-0 font-semibold">Unit {unit.number}</span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate font-bold text-foreground">{lesson.title}</span>
            </div>
          </div>
        </section>

        <section className="border-b border-border/70 bg-gradient-to-br from-primary/8 via-background to-background">
          <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
              {subject.subjectCode} · Unit {unit.number}: {unit.title}
            </p>
            <h1 className="mt-2 max-w-5xl text-2xl font-black tracking-tight sm:text-4xl">
              {lesson.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-semibold text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{lesson.durationMin} min</span>
              <span className="inline-flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5" /><span className="capitalize">{lesson.difficulty}</span></span>
              <span className="inline-flex items-center gap-1.5"><Layers3 className="h-3.5 w-3.5" />Lesson {currentIndex + 1} of {allLessons.length}</span>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-[1500px] px-3 py-4 sm:px-6 lg:px-8">
          <MaterialsReadingExperience
            lesson={lesson}
            subject={subjectNotes}
            lessons={allLessons}
            prevHref={prevHref}
            nextHref={nextHref}
            prevTitle={prev?.title}
            nextTitle={next?.title}
          />
        </div>
      </main>
      <Footer />
    </div>
  )
}

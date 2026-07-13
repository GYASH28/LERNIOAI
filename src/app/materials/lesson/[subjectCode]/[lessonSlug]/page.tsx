import { redirect, notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { TopBar } from '@/components/layout/top-bar'
import { Footer } from '@/components/layout/footer'
import { getSubjectNotes, findLessonBySlug, getAdjacentLessons } from '@/lib/curriculum/lesson-notes-loader'
import { PremiumLessonReader } from '@/components/learning/premium-lesson-reader'

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

  const { lesson } = match
  const { prev, next } = getAdjacentLessons(subjectCode, lessonSlug)

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <TopBar />
      <main className="flex-1 page-wipe">
        {/* Premium Lesson Reader — 10x better reading experience */}
        <PremiumLessonReader
          lesson={lesson}
          subject={subjectNotes}
          prevHref={prev ? `/materials/lesson/${subjectCode}/${prev.slug}` : null}
          nextHref={next ? `/materials/lesson/${subjectCode}/${next.slug}` : null}
          prevTitle={prev?.title}
          nextTitle={next?.title}
        />
      </main>
      <Footer />
    </div>
  )
}

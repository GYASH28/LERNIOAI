import '@/styles/notes-reader-v4.css'
import '@/styles/notes-reader-shell.css'

import { InteractiveNotesRenderer } from '@/components/learning/interactive-notes-renderer'
import {
  findLessonBySlug,
  getAdjacentLessons,
} from '@/lib/curriculum/lesson-notes-loader'

type LessonReaderLayoutProps = Readonly<{
  children: React.ReactNode
  params: Promise<{
    programmeCode: string
    semesterNumber: string
    subjectCode: string
    lessonSlug: string
  }>
}>

export default async function LessonReaderLayout({
  children,
  params,
}: LessonReaderLayoutProps) {
  const { programmeCode, semesterNumber, subjectCode, lessonSlug } = await params
  const match = findLessonBySlug(subjectCode, lessonSlug)

  if (!match) {
    return <div className="lesson-notes-v4">{children}</div>
  }

  const adjacent = getAdjacentLessons(subjectCode, match.lesson.slug)
  const lessonBase = `/learn/${encodeURIComponent(programmeCode)}/semester/${encodeURIComponent(semesterNumber)}/subject/${encodeURIComponent(subjectCode)}/lesson`
  const prevHref = adjacent.prev
    ? `${lessonBase}/${encodeURIComponent(adjacent.prev.slug)}`
    : null
  const nextHref = adjacent.next
    ? `${lessonBase}/${encodeURIComponent(adjacent.next.slug)}`
    : null

  return (
    <div className="lesson-notes-v4 lesson-notes-v4--full-reader">
      {children}

      <section
        id="complete-study-notes"
        className="lesson-notes-v4__full-reader mx-auto w-full max-w-[96rem] px-4 pb-12 pt-2 sm:px-6 lg:px-8"
        aria-label={`Complete study notes for ${match.lesson.title}`}
      >
        <div className="lesson-notes-v4__reader-intro">
          <div>
            <p className="lesson-notes-v4__eyebrow">Complete study notes</p>
            <h2>Understand it first. Revise it fast later.</h2>
            <p>
              Full theory, examples, diagrams, exam questions, viva prep, flashcards and revision tools
              for this lesson are collected in one distraction-free reader.
            </p>
          </div>
          <div className="lesson-notes-v4__reader-meta" aria-label="Lesson note summary">
            <span>{match.subject.subjectCode}</span>
            <span>Unit {match.unit.number}</span>
            <span>{match.lesson.durationMin} min</span>
          </div>
        </div>

        <InteractiveNotesRenderer
          lesson={match.lesson}
          subject={match.subject}
          prevHref={prevHref}
          nextHref={nextHref}
        />
      </section>
    </div>
  )
}

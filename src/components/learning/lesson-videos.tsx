'use client'

import { ExternalLink, Film, Globe2, Languages, Search, ShieldCheck } from 'lucide-react'
import type { Lesson, SubjectNotes } from '@/lib/curriculum/lesson-notes-loader'

/**
 * Keep unreviewed YouTube candidates out of the embedded player.
 * The lesson-specific searches below are discovery links, NOT reviewed videos.
 * When the governed resource-review pipeline publishes a valid direct video,
 * it can be passed here as a reviewedVideo and embedded separately.
 */
export interface ReviewedLessonVideo {
  videoId: string
  title: string
  channel: string
  language: 'en' | 'hi' | 'hinglish'
  verifiedAt: string
  curriculumMatch: true
}

export function lessonVideoSearchHref(
  lessonTitle: string,
  subjectName: string,
  language: 'en' | 'hi' | 'hinglish',
): string {
  const suffix =
    language === 'hi' ? 'हिंदी में lecture' :
    language === 'hinglish' ? 'Hinglish explained with examples' :
    'English tutorial explained examples'
  const query = [lessonTitle, subjectName, suffix].join(' ').trim()
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
}

export function LessonVideos({
  subject,
  lesson,
  reviewedVideo,
}: {
  subject: SubjectNotes
  lesson: Lesson
  reviewedVideo?: ReviewedLessonVideo | null
}) {
  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border bg-gradient-to-br from-primary/10 via-background to-background p-5 sm:p-7">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
            <Film className="h-4 w-4" />
            Watch & learn
          </div>
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{lesson.title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Learn at your own pace. Compare what the video teaches with the written
            objectives and practice examples before moving to the next lesson.
          </p>
        </div>
        {reviewedVideo ? (
          <div className="p-4 sm:p-6">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 font-semibold text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" /> Curriculum reviewed
              </span>
              <span>{reviewedVideo.channel}</span>
              <span>·</span>
              <span>{reviewedVideo.language.toUpperCase()}</span>
            </div>
            <div className="aspect-video overflow-hidden rounded-xl bg-black">
              <iframe
                className="h-full w-full"
                title={reviewedVideo.title}
                src={`https://www.youtube-nocookie.com/embed/${reviewedVideo.videoId}`}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
            <p className="mt-3 text-sm font-semibold">{reviewedVideo.title}</p>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3 p-5 sm:p-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              Lesson video awaiting review
            </span>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Lernio has not approved a specific lecture for this exact lesson yet.
              Rather than autoplaying an unrelated playlist, you can search for the
              topic below. Search results are external and have not been checked by Lernio.
            </p>
          </div>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {([
          { language: 'hinglish' as const, label: 'Hinglish', detail: 'Easy explanations & examples', icon: Languages },
          { language: 'hi' as const, label: 'Hindi', detail: 'Hindi-language lessons', icon: Languages },
          { language: 'en' as const, label: 'English', detail: 'Concepts & practical demos', icon: Globe2 },
        ]).map((item) => (
          <a
            key={item.language}
            href={lessonVideoSearchHref(lesson.title, subject.subjectName, item.language)}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
          >
            <div className="rounded-lg bg-primary/10 p-2 text-primary"><item.icon className="h-4 w-4" /></div>
            <div className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                {item.label} <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">{item.detail}</span>
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
                <Search className="h-3.5 w-3.5" /> Find on YouTube
              </span>
            </div>
          </a>
        ))}
      </div>
      <section className="rounded-xl border border-border/80 bg-muted/30 p-5">
        <h3 className="text-sm font-bold">What this video needs to teach</h3>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {(lesson.objectives?.length ? lesson.objectives : lesson.keyConcepts.slice(0,5))
            .slice(0,6).map((objective, index) => (
              <li key={index} className="flex items-start gap-2 text-sm leading-6 text-foreground/85">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {objective}
              </li>
            ))}
        </ul>
      </section>
    </div>
  )
}

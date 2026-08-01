import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  LibraryBig,
  PenTool,
  RotateCcw,
} from 'lucide-react'
import type { CurrentLearningContext } from '@/lib/learning/current-learning-context'

export function CurrentLearningContextCard({
  context,
  compact = false,
}: {
  context: CurrentLearningContext | null
  compact?: boolean
}) {
  if (!context) return null

  const query = new URLSearchParams({
    from: 'learning-context',
    programme: context.programme,
    semester: String(context.semester),
    subject: context.subjectCode,
    lesson: context.lessonSlug,
    returnTo: context.href,
  }).toString()

  return (
    <aside className="rounded-2xl border border-primary/20 bg-primary/5 p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-primary">
            <BookOpen className="h-4 w-4" /> Current learning context
          </div>
          <h2 className="mt-2 truncate text-base font-black sm:text-lg">
            {context.lessonTitle}
          </h2>
          <p className="mt-1 truncate text-xs text-muted-foreground sm:text-sm">
            {context.subjectCode} · {context.subjectName} · Semester {context.semester}
          </p>
        </div>
        <Link
          href={context.resumeHref}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground"
        >
          Resume lesson <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {!compact && (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ContextAction href={`/practice?${query}`} label="Practise it" icon={PenTool} />
          <ContextAction href={`/revision?${query}`} label="Revise it" icon={RotateCcw} />
          <ContextAction href={`/tutor?${query}`} label="Ask LEO" icon={BrainCircuit} />
          <ContextAction href={`/notebook?${query}`} label="Save a note" icon={LibraryBig} />
        </div>
      )}
    </aside>
  )
}

function ContextAction({
  href,
  label,
  icon: Icon,
}: {
  href: string
  label: string
  icon: typeof BookOpen
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 text-xs font-bold hover:bg-accent"
    >
      <Icon className="h-4 w-4 text-primary" /> {label}
    </Link>
  )
}

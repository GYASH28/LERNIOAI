import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, ArrowRight, TriangleAlert } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getAcademicProfile } from '@/lib/academics/profile-store'
import { getMistakes } from '@/lib/academics/revision-store'
import { TopBar } from '@/components/layout/top-bar'

export const dynamic = 'force-dynamic'

export default async function MistakeNotebookPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/revision/mistakes')
  const profile = await getAcademicProfile(user.id)
  if (!profile) redirect('/onboarding')
  const mistakes = await getMistakes(user.id)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <main className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-6">
        <Link href="/revision" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Revision</Link>
        <header className="mt-5"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Mistake Notebook</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Turn wrong answers into useful revision.</h1><p className="mt-2 text-sm text-muted-foreground">Mistakes appear here automatically from the new academic practice engine.</p></header>

        {mistakes.length ? (
          <div className="mt-7 space-y-3">
            {mistakes.map((mistake) => (
              <article key={mistake.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary"><TriangleAlert className="h-4 w-4" /> Class {mistake.classLevel} · {mistake.subjectSlug} · {mistake.chapterSlug.replaceAll('-', ' ')}</div>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">Missed {mistake.occurrenceCount}×</span>
                </div>
                <p className="mt-4 line-clamp-3 whitespace-pre-wrap text-sm leading-6">{mistake.prompt}</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground">{mistake.category ? `Category: ${mistake.category}` : 'Categorize this after review'}{mistake.nextReviewAt ? ` · Review ${mistake.nextReviewAt <= new Date() ? 'due' : 'scheduled'}` : ''}</p>
                  <Link href={`/practice/session?class=${mistake.classLevel}&subject=${mistake.subjectSlug}&chapter=${mistake.chapterSlug}`} className="inline-flex items-center gap-2 text-sm font-semibold text-primary">Retry chapter <ArrowRight className="h-4 w-4" /></Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <section className="mt-7 rounded-3xl border border-dashed border-border bg-card p-8 text-center"><TriangleAlert className="mx-auto h-8 w-8 text-muted-foreground" /><h2 className="mt-4 text-xl font-semibold">No mistakes yet.</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Questions you get wrong in academic practice will automatically appear here for revision.</p><Link href="/practice" className="mt-5 inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Start practice</Link></section>
        )}
      </main>
    </div>
  )
}

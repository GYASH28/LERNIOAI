import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, RotateCw } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getAcademicProfile } from '@/lib/academics/profile-store'
import { db } from '@/lib/db'
import { TopBar } from '@/components/layout/top-bar'

export const dynamic = 'force-dynamic'

interface RevisionRow {
  id: string
  kind: string
  subjectSlug: string
  chapterSlug: string | null
  topicSlug: string | null
  confidence: number | null
  dueAt: Date
  reviewCount: number
}

export default async function RevisionQueuePage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/revision/queue')
  const profile = await getAcademicProfile(user.id)
  if (!profile) redirect('/onboarding')

  const items = await db.$queryRaw<RevisionRow[]>`
    SELECT "id", "kind", "subjectSlug", "chapterSlug", "topicSlug", "confidence", "dueAt", "reviewCount"
    FROM "AcademicRevisionItem"
    WHERE "userId" = ${user.id} AND "dueAt" <= NOW()
    ORDER BY "dueAt" ASC
    LIMIT 50
  `.catch(() => [])

  return (
    <div className="min-h-screen bg-background text-foreground"><TopBar /><main className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-6">
      <Link href="/revision" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Revision</Link>
      <header className="mt-5"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Revision Queue</p><h1 className="mt-2 text-3xl font-bold tracking-tight">{items.length} {items.length === 1 ? 'item' : 'items'} due now.</h1><p className="mt-2 text-sm text-muted-foreground">Only stored revision items appear here—no filler cards.</p></header>
      {items.length ? <div className="mt-7 space-y-3">{items.map((item) => <div key={item.id} className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">{item.subjectSlug} · {item.kind}</p><h2 className="mt-1 font-semibold capitalize">{(item.topicSlug ?? item.chapterSlug ?? 'Revision item').replaceAll('-', ' ')}</h2></div><span className="text-xs text-muted-foreground">Review {item.reviewCount + 1}</span></div></div>)}</div> : <section className="mt-7 rounded-3xl border border-dashed border-border bg-card p-8 text-center"><RotateCw className="mx-auto h-8 w-8 text-muted-foreground" /><h2 className="mt-4 text-xl font-semibold">You’re caught up.</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">New items will appear after practice, mistakes and saved revision content create a real reason to review them.</p><Link href="/practice" className="mt-5 inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Practice now</Link></section>}
    </main></div>
  )
}

import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getManifestSubjectsForSemester } from '@/lib/curriculum/manifest-data'
import { FlaskConical, PlayCircle, ExternalLink } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function LabsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/labs')

  const subjects = getManifestSubjectsForSemester('DCOMP', 3)
  const labSubjects = subjects.filter(s => s.category === 'practical' || s.name.includes('Workshop') || s.name.includes('Lab'))

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold">Labs</h1>
        <p className="mt-1 text-sm text-muted-foreground">Practical lab resources and video demonstrations for lab subjects.</p>
        
        <div className="mt-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase text-muted-foreground">
            <FlaskConical className="h-4 w-4" /> Lab Subjects
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {labSubjects.length > 0 ? labSubjects.map(s => (
              <Link key={s.code} href={`/learn/DCOMP/semester/3/subject/${s.code}`} className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground">{s.code}</p>
                    <h3 className="mt-1 text-sm font-medium">{s.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{s.coverageFocus}</p>
                  </div>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10"><PlayCircle className="h-4 w-4 text-primary" /></div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">{s.resources.length} video demonstrations</div>
              </Link>
            )) : (
              <p className="col-span-2 py-8 text-center text-sm text-muted-foreground">No lab subjects found for this semester. Check back later.</p>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold">Coding Lab</h3>
          <p className="mt-1 text-xs text-muted-foreground">Practice programming with an in-browser code editor.</p>
          <Link href="/coding" className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline">
            Open Coding Lab <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </main>
  )
}

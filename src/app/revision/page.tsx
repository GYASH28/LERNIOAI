import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getManifestSubjectsForSemester } from '@/lib/curriculum/manifest-data'
import { RevisionClient } from './revision-client'

export const dynamic = 'force-dynamic'

export default async function RevisionPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/revision')

  const subjects = getManifestSubjectsForSemester('DCOMP', 3)

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold">Revision</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review key concepts from your subjects. Flip cards to test your recall.</p>
        <div className="mt-6">
          <RevisionClient subjects={subjects.map(s => ({ code: s.code, name: s.name, coverageFocus: s.coverageFocus }))} />
        </div>
      </div>
    </main>
  )
}

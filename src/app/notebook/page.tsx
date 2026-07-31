import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getCurrentLearningContext } from '@/lib/learning/current-learning-context'
import { AuthenticatedPageShell } from '@/components/app/authenticated-page-shell'
import { CurrentLearningContextCard } from '@/components/app/current-learning-context-card'
import { NotebookClient } from '@/components/student-os/notebook-client'

export const dynamic = 'force-dynamic'

export default async function NotebookPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/notebook')

  const context = await getCurrentLearningContext(user.id)

  return (
    <AuthenticatedPageShell current="notebook" maxWidth="7xl">
      <div className="mb-5">
        <CurrentLearningContextCard context={context} compact />
      </div>
      <NotebookClient />
    </AuthenticatedPageShell>
  )
}

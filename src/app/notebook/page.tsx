import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { AuthenticatedPageShell } from '@/components/app/authenticated-page-shell'
import { NotebookClient } from '@/components/student-os/notebook-client'

export const dynamic = 'force-dynamic'

export default async function NotebookPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/notebook')

  return (
    <AuthenticatedPageShell current="notebook" maxWidth="7xl">
      <NotebookClient />
    </AuthenticatedPageShell>
  )
}

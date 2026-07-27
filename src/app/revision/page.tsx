import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { RouteViewPage } from '@/components/app/route-view-page'

export const dynamic = 'force-dynamic'

export default async function RevisionPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/revision')

  // RouteViewPage → LearningApp already renders the shared TopBar + Footer.
  // Wrapping them here would duplicate the chrome (see /analytics, /tutor, /profile).
  return <RouteViewPage view="revision" />
}

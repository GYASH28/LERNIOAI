import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * Authority workspace shortcut for the `reviewer` role.
 *
 * There is no dedicated reviewer surface yet — reviewers currently use the
 * standard student dashboard. This stub keeps the legacy `/reviewer` path
 * (referenced from `campus-auth.ts` and the sidebar `AUTHORITY_ROUTES` map)
 * resolvable so role-keyed links never 404. Unauthenticated visitors are
 * sent to sign-in first.
 */
export default async function ReviewerRedirectPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/reviewer')
  redirect('/dashboard')
}

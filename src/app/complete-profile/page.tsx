import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getAcademicProfile } from '@/lib/academics/profile-store'

export const dynamic = 'force-dynamic'

/**
 * Compatibility route for accounts created before the Class 11/12/JEE
 * transformation. The old diploma profile form is intentionally retired.
 */
export default async function CompleteProfilePage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/onboarding')

  const profile = await getAcademicProfile(user.id)
  redirect(profile ? '/dashboard' : '/onboarding')
}

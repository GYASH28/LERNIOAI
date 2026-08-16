import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getAcademicProfile } from '@/lib/academics/profile-store'
import { OnboardingFlow } from './onboarding-flow'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/onboarding')

  const profile = await getAcademicProfile(user.id)
  if (profile) redirect('/dashboard')

  return <OnboardingFlow firstName={user.name.split(' ')[0]} />
}

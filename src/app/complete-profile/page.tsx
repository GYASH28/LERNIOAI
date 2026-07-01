import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { CompleteProfileForm } from '@/app/complete-profile/complete-profile-form'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export default async function CompleteProfilePage() {
  if (process.env.LERNIO_DEMO_MODE === 'true') {
    redirect('/dashboard')
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    redirect('/sign-in?callbackUrl=/complete-profile')
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    select: {
      name: true,
      email: true,
      role: true,
      rollNumber: true,
      departmentCode: true,
      semesterNumber: true,
      division: true,
      profileComplete: true,
    },
  })

  if (!user) {
    redirect('/sign-in?callbackUrl=/complete-profile')
  }

  if (user.profileComplete) {
    redirect('/dashboard')
  }

  return <CompleteProfileForm user={user} />
}

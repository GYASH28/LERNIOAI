import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getCurrentLearningContext } from '@/lib/learning/current-learning-context'

export const dynamic = 'force-dynamic'

export default async function ContinueLearningPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/learn/current')

  const context = await getCurrentLearningContext(user.id)
  if (context) redirect(context.resumeHref)

  redirect('/learn')
}

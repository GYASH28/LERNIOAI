import { redirect } from 'next/navigation'
import { isDatabaseUnavailableError } from '@/lib/api-error-policy'
import { getCurrentUser } from '@/lib/auth'
import {
  getStudentLearningScope,
  hasResolvedLearningScope,
} from '@/features/learning/server/get-student-learning-scope'
import { LearnViewClient } from './learn-view-client'

export const dynamic = 'force-dynamic'

export default async function LearnPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/sign-in?callbackUrl=/learn')
  }

  try {
    const scope = await getStudentLearningScope(user.id, { includeSubjects: false })
    if (hasResolvedLearningScope(scope)) {
      redirect(`/learn/${scope.programme.code}/semester/${scope.semester.number}`)
    }
  } catch (error) {
    if (!isDatabaseUnavailableError(error)) throw error
  }

  return <LearnViewClient />
}

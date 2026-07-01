import { redirect } from 'next/navigation'
import { isDatabaseUnavailableError } from '@/lib/api-error-policy'
import { getCurrentUser } from '@/lib/auth'
import {
  getStudentLearningScope,
  hasResolvedLearningScope,
} from '@/features/learning/server/get-student-learning-scope'

export const dynamic = 'force-dynamic'

export default async function LearnPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/sign-in?callbackUrl=/learn')
  }

  // Try to resolve the student's learning scope from the DB.
  // If successful, redirect to their canonical semester page.
  try {
    const scope = await getStudentLearningScope(user.id, { includeSubjects: false })
    if (hasResolvedLearningScope(scope)) {
      redirect(`/learn/${scope.programme.code}/semester/${scope.semester.number}`)
    }
  } catch (error) {
    if (!isDatabaseUnavailableError(error)) throw error
    // DB unavailable — fall through to default redirect below
  }

  // Fallback: redirect to the user's default programme + semester.
  // New OAuth users are auto-assigned to DCOMP / Semester 3 (see auth.ts createUser event).
  // The semester page has a manifest fallback that shows subjects + YouTube
  // resources even when the DB has no curriculum data yet.
  const programmeCode = user.role === 'student' ? 'DCOMP' : 'DCOMP'
  const semesterNumber = 3

  redirect(`/learn/${programmeCode}/semester/${semesterNumber}`)
}

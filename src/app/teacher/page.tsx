import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * Authority workspace shortcut for the `teacher` role.
 *
 * The dedicated teacher surface lives at `/teacher-dashboard`; this stub
 * keeps the legacy `/teacher` path (referenced from `campus-auth.ts` and
 * the sidebar `AUTHORITY_ROUTES` map) resolvable so role-keyed links never
 * 404. Unauthenticated visitors are sent to sign-in first.
 */
export default async function TeacherRedirectPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/teacher')
  // Teachers (and admins acting as teachers) land on the teacher dashboard.
  // Any other role is bounced to the standard dashboard to avoid a
  // permission dead-end.
  if (user.role === 'teacher' || user.role === 'admin') {
    redirect('/teacher-dashboard')
  }
  redirect('/dashboard')
}

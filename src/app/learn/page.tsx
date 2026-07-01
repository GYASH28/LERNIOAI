import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'

// Don't force-dynamic — this page just redirects. Making it dynamic
// causes an unnecessary server round-trip on every visit.
export default async function LearnPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/sign-in?callbackUrl=/learn')
  }

  // Skip the DB scope resolution — it's slow and causes a redirect chain.
  // New OAuth users are auto-assigned to DCOMP / Semester 3.
  // The semester page reads from the manifest (instant, no DB needed).
  redirect('/learn/DCOMP/semester/3')
}

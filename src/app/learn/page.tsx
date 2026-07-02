import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function LearnPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/sign-in?callbackUrl=/learn')
  }
  redirect('/learn/DCOMP/semester/3')
}

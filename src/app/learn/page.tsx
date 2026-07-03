import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function LearnPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/sign-in?callbackUrl=/learn')
  }

  // Get user's actual semester and department from DB
  let programmeCode = 'DCOMP'
  let semesterNumber = 1

  try {
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { semesterNumber: true, departmentCode: true },
    })
    if (dbUser) {
      programmeCode = dbUser.departmentCode === 'DCIOT' ? 'DCIOT' : 'DCOMP'
      semesterNumber = dbUser.semesterNumber || 1
    }
  } catch {
    // DB unavailable — default to semester 1
  }

  redirect(`/learn/${programmeCode}/semester/${semesterNumber}`)
}

import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { BackButton } from '@/components/ui/back-button'
import { AdminUsersClient } from './users-client'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/admin/users')
  if (user.role !== 'admin') redirect('/dashboard')

  // Fetch all users
  let users: any[] = []
  try {
    users = await db.user.findMany({
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        departmentCode: true,
        semesterNumber: true,
        division: true,
        rollNumber: true,
        xp: true,
        streak: true,
        createdAt: true,
        lastActiveDate: true,
      },
    })
  } catch (err) {
    console.error('[admin/users] Failed to fetch users:', err)
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-5 py-6 sm:px-6 lg:px-8">
        <BackButton />
        <h1 className="text-2xl font-bold">Manage Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View, search, and delete user accounts. Total: {users.length} users.
        </p>
        <div className="mt-6">
          <AdminUsersClient users={users} currentUserId={user.id} />
        </div>
      </div>
    </main>
  )
}

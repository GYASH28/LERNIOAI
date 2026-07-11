import { redirect } from 'next/navigation'
import { BackButton } from "@/components/ui/back-button"
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { NotificationsList } from './notifications-list'

export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/notifications')

  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
          <BackButton />
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Stay updated on your progress, achievements, and important alerts.
        </p>
        <div className="mt-6">
          <NotificationsList initialNotifications={notifications.map((n) => ({
            ...n,
            createdAt: n.createdAt.toISOString(),
            readAt: n.readAt?.toISOString() ?? null,
          }))} />
        </div>
      </div>
    </main>
  )
}

import { db } from '@/lib/db'
import { withApi, okResponse } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Cron endpoint: checks for revision schedules that are due
 * and creates in-app notifications for students.
 * Called by Vercel Cron (daily, 8 AM IST).
 */
export function POST() {
  return withApi(async () => {
    const now = new Date()
    
    // Find revision schedules that are due
    const dueSchedules = await db.revisionSchedule.findMany({
      where: { nextDueDate: { lte: now } },
      select: { id: true, userId: true, topic: { select: { title: true } } },
      take: 100,
    })

    // Create notifications for each due revision
    let created = 0
    for (const sched of dueSchedules) {
      const topicTitle = sched.topic?.title ?? 'a topic'
      await db.notification.create({
        data: {
          userId: sched.userId,
          type: 'streak_warning',
          title: 'Revision Due',
          body: `Time to review: ${topicTitle}. Spaced repetition helps you retain 90% more.`,
          link: '/revision',
        },
      }).catch(() => {})
      created++
    }

    console.log(`[revision-reminders] Created ${created} notifications`)
    return okResponse({ notificationsCreated: created })
  })
}

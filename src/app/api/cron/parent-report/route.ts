import { db } from '@/lib/db'
import { withApi, okResponse } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Cron endpoint: sends weekly progress reports to parents/guardians.
 * Called by Vercel Cron (weekly, Sunday 6 PM IST).
 * 
 * For now, this just logs the report. Email sending requires RESEND_API_KEY.
 */
export function POST() {
  return withApi(async () => {
    // Fetch students with their progress
    const students = await db.user.findMany({
      where: { role: 'student', status: 'active' },
      select: { id: true, name: true, email: true, xp: true, streak: true, lastActiveDate: true },
      take: 100,
    })

    // Generate report data
    const reports = students.map(s => ({
      studentName: s.name,
      xp: s.xp,
      streak: s.streak,
      lastActive: s.lastActiveDate,
      summary: `${s.name} has ${s.xp} XP and a ${s.streak}-day streak. Last active: ${s.lastActiveDate ?? 'Unknown'}.`,
    }))

    // TODO: Send emails via Resend when RESEND_API_KEY is configured
    // For now, just log
    console.log(`[parent-report] Generated ${reports.length} reports`)

    return okResponse({ generated: reports.length, reports })
  })
}

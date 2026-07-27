import { db } from '@/lib/db'
import { withApi, okResponse } from '@/lib/auth'
import { sendTransactionalEmail, isEmailConfigured } from '@/lib/email'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Cron endpoint: sends weekly progress reports to parents/guardians.
 * Called by Vercel Cron (weekly, Sunday 6 PM IST).
 *
 * When the email provider is not configured, the reports are still generated
 * (so the cron result is visible to admins / logs) but `emailsSent` is 0 and
 * a `warning` field is returned. This makes the silent failure visible
 * without crashing the cron.
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
    const reports = students.map((s) => ({
      studentName: s.name,
      studentEmail: s.email,
      xp: s.xp,
      streak: s.streak,
      lastActive: s.lastActiveDate,
      summary: `${s.name} has ${s.xp} XP and a ${s.streak}-day streak. Last active: ${s.lastActiveDate ?? 'Unknown'}.`,
    }))

    if (!isEmailConfigured()) {
      console.warn('[parent-report] Email provider not configured — reports generated but not sent.')
      return okResponse({
        generated: reports.length,
        emailsSent: 0,
        warning: 'Email provider not configured — reports were generated but not sent.',
        reports,
      })
    }

    let emailsSent = 0
    for (const report of reports) {
      try {
        await sendTransactionalEmail({
          to: report.studentEmail,
          subject: `Weekly Progress Report — ${report.studentName}`,
          html: `<h2>Weekly Progress Report</h2><p>${report.summary}</p>`,
          text: `Weekly Progress Report — ${report.studentName}\n\n${report.summary}`,
        })
        emailsSent++
      } catch (err) {
        console.error(`[parent-report] Failed to send email for ${report.studentName}:`, err)
      }
    }

    return okResponse({ generated: reports.length, emailsSent, reports })
  })
}

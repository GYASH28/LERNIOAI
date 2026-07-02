import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { FeedbackForm } from './feedback-form'

export const dynamic = 'force-dynamic'

export default async function FeedbackPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/feedback')

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold">Send Feedback</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Found a bug? Have an idea? Let us know — we read every message.
        </p>
        <div className="mt-6">
          <FeedbackForm />
        </div>
      </div>
    </main>
  )
}

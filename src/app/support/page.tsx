import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicPageShell } from '@/components/marketing/public-page-shell'
import { Button } from '@/components/ui/button'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Mail, ArrowRight, LifeBuoy } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Support · Lernio AI',
  description: 'Get help with Lernio. Contact, sign in, or sign up.',
}

export default async function SupportPage() {
  const session = await getServerSession(authOptions)
  return (
    <PublicPageShell isAuthenticated={Boolean(session?.user)}>
      <section className="marketing-container py-12 md:py-20">
        <div className="max-w-2xl">
          <p className="marketing-eyebrow">
            <LifeBuoy className="h-3.5 w-3.5" aria-hidden="true" />
            Support
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            How can we help?
          </h1>
          <p className="mt-4 text-lg leading-7 text-muted-foreground">
            Lernio is a student-first learning workspace. If something is not
            working, or if you have a question, here are the fastest ways to
            reach us.
          </p>

          <div className="mt-8 rounded-2xl border border-border bg-card p-6">
            <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
              <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
              Email
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The fastest way to reach a human:{' '}
              <a
                href="mailto:support@lernio.ai"
                className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
              >
                support@lernio.ai
              </a>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Please include your account email and a short description of the
              issue. We aim to respond within two working days.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="gap-1.5">
              <Link href="/sign-up">
                Create an account
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/sign-in">Sign in</Link>
            </Button>
          </div>

          <div className="mt-10">
            <h2 className="text-base font-bold text-foreground">
              Common questions
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                &middot; Lost your password? Use the forgot-password flow on
                the sign-in page.
              </li>
              <li>
                &middot; Cannot access a staff role? Ask your existing admin
                to issue an invite code.
              </li>
              <li>
                &middot; Found a bug? Email us with steps to reproduce, or
                open an issue on{' '}
                <a
                  href="https://github.com/GYASH28/LERNIOAI"
                  target="_blank" rel="noopener noreferrer"
                  className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
                >
                  GitHub
                </a>
                .
              </li>
            </ul>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}

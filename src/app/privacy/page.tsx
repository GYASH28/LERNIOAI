import type { Metadata } from 'next'
import { PublicPageShell } from '@/components/marketing/public-page-shell'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Privacy Policy · Lernio AI',
  description:
    'How Lernio collects, uses and protects your learning data. Export and delete controls.',
}

export default async function PrivacyPage() {
  const session = await getServerSession(authOptions)
  return (
    <PublicPageShell isAuthenticated={Boolean(session?.user)}>
      <article className="marketing-container py-12 md:py-16">
        <div className="prose prose-sm max-w-2xl dark:prose-invert">
          <h1>Privacy Policy</h1>
          <p className="text-muted-foreground">
            Last updated: {new Date().getFullYear()}
          </p>

          <h2>What we store</h2>
          <ul>
            <li>
              <strong>Account details:</strong> your name, email, hashed
              password, and role.
            </li>
            <li>
              <strong>Academic profile:</strong> programme, department,
              semester, division, roll number and exam date — all optional.
            </li>
            <li>
              <strong>Learning data:</strong> lesson completions, question
              attempts, exam attempts, tutor sessions, revision schedules,
              study tasks, XP events and achievements.
            </li>
            <li>
              <strong>Rate-limit buckets:</strong> used to prevent brute-force
              login attempts. We do not store raw IP addresses long-term.
            </li>
          </ul>

          <h2>How we use it</h2>
          <ul>
            <li>To show you your own progress and personalised recommendations.</li>
            <li>To score attempts and award XP on the server.</li>
            <li>To schedule revision cards based on your performance.</li>
            <li>To prevent abuse and brute-force attacks.</li>
          </ul>
          <p>
            We never sell your data. We never share it with third parties for
            advertising.
          </p>

          <h2>AI Tutor data flow</h2>
          <p>
            When you ask the AI Tutor a question, Lernio retrieves approved
            lesson content from the database, injects it into the prompt, and
            sends the prompt to the AI provider. Your question and the
            generated answer are stored as a tutor session so you can revisit
            them. We do not log raw provider responses beyond your session
            history.
          </p>

          <h2>Export your data</h2>
          <p>
            You can download a full JSON export of your account, attempts,
            tutor sessions and achievements from{' '}
            <strong>Profile &rarr; Export data</strong> at any time.
          </p>

          <h2>Delete your account</h2>
          <p>
            You can permanently delete your account from{' '}
            <strong>Profile &rarr; Delete account</strong>. Deletion removes
            your account, attempts, tutor sessions, revision cards and XP.
            This action cannot be undone.
          </p>

          <h2>Security</h2>
          <ul>
            <li>Passwords are hashed with bcrypt before storage.</li>
            <li>All server routes require an authenticated session.</li>
            <li>Elevated roles require a cryptographically-strong invite code.</li>
            <li>Every user-owned resource is scoped by user id — no cross-user access.</li>
          </ul>

          <h2>Contact</h2>
          <p>
            Questions about privacy? Email{' '}
            <a href="mailto:support@lernio.ai">support@lernio.ai</a> or visit{' '}
            <a href="/support">the support page</a>.
          </p>
        </div>
      </article>
    </PublicPageShell>
  )
}

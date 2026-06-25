import { ShieldCheck, Lock, FileLock2, BadgeCheck, Download, Trash2 } from 'lucide-react'

const PILLARS = [
  {
    title: 'Server-scored attempts',
    body: 'Correctness, XP and streaks are all computed on the server. The browser can never set its own score.',
    Icon: BadgeCheck,
  },
  {
    title: 'Private progress',
    body: 'Your attempts, tutor sessions and revision cards are yours. Every query is scoped by user id.',
    Icon: Lock,
  },
  {
    title: 'Role protection',
    body: 'Elevated actions require a valid invite or admin approval. Students cannot self-escalate.',
    Icon: ShieldCheck,
  },
  {
    title: 'Verified academic sources',
    body: 'AI Tutor citations reference real, approved Lernio lessons — not the open web.',
    Icon: FileLock2,
  },
  {
    title: 'Export your data',
    body: 'Download a full JSON export of your progress, attempts and tutor sessions at any time.',
    Icon: Download,
  },
  {
    title: 'Delete your account',
    body: 'One click permanently removes your account and learning data. No hidden retention.',
    Icon: Trash2,
  },
] as const

export function TrustSection() {
  return (
    <section
      className="marketing-section border-b border-border bg-muted/30"
      aria-labelledby="trust-heading"
    >
      <div className="marketing-container">
        <div className="max-w-2xl">
          <p className="marketing-eyebrow">Privacy &amp; trust</p>
          <h2 id="trust-heading" className="marketing-h2 mt-3">
            Your data stays yours.
          </h2>
          <p className="marketing-lede mt-4">
            Lernio is designed for students first. Security claims listed here
            are backed by the server-authoritative architecture and tested
            ownership checks — not marketing language.
          </p>
        </div>

        <div
          className="marketing-card-grid marketing-card-grid--three mt-10"
          data-marketing-grid="trust"
        >
          {PILLARS.map((p) => (
            <article
              key={p.title}
              className="flex h-full flex-col rounded-2xl border border-border bg-card p-5"
            >
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-border">
                <p.Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-sm font-bold text-foreground">
                {p.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {p.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

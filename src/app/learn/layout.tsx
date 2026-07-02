import { LearnShell } from '@/components/app/learn-shell'

export default async function LearnLayout({ children }: { children: React.ReactNode }) {
  // No DB bootstrap — learn pages read from static JSON manifests.
  // This makes every learn page load instantly (no DB round-trip).
  return <LearnShell>{children}</LearnShell>
}

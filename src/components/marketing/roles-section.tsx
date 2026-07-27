import { CAPABILITY_REPLACEMENTS, CORE_ROLE_WORKSPACES } from '@/lib/cwit-academic-os'
import { Badge } from '@/components/ui/badge'
import { ShieldCheck } from 'lucide-react'

export function RolesSection() {
  return (
    <section
      className="marketing-section border-b border-border"
      aria-labelledby="roles-heading"
    >
      <div className="marketing-container max-w-5xl">
        <p className="marketing-eyebrow">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Student &amp; campus roles
        </p>
        <h2 id="roles-heading" className="marketing-h2 mt-3">
          Built for students and CRs. Admin keeps it all running.
        </h2>
        <p className="marketing-lede mt-4">
          Students sign up directly with their email. CRs receive a guarded
          invite code from the admin. That&apos;s it &mdash; no teachers, no
          coordinators, no unnecessary hierarchy. Just students, their class
          representative, and the admin who keeps the system running.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {CORE_ROLE_WORKSPACES.map((item) => (
            <div key={item.role} className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-bold text-foreground">{item.role}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.work}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {CAPABILITY_REPLACEMENTS.map((capability) => (
            <Badge
              key={capability}
              variant="secondary"
              className="gap-1.5 px-3 py-1.5 text-xs capitalize"
            >
              {capability}
            </Badge>
          ))}
        </div>
      </div>
    </section>
  )
}

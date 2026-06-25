import { Badge } from '@/components/ui/badge'
import { CAMPUS_ROLES, CAMPUS_ROLE_LABELS } from '@/lib/campus-auth'
import { ShieldCheck } from 'lucide-react'

export function RolesSection() {
  return (
    <section
      className="marketing-section border-b border-border"
      aria-labelledby="roles-heading"
    >
      <div className="marketing-container">
        <div className="mx-auto max-w-4xl">
          <p className="marketing-eyebrow">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Staff &amp; campus roles
          </p>
          <h2 id="roles-heading" className="marketing-h2 mt-3">
            Invite-based access for staff.
          </h2>
          <p className="marketing-lede mt-4">
            Students never need an invite. CRs, teachers, coordinators,
            reviewers, moderators and admins get elevated access only through a
            cryptographically strong invite code issued by an existing admin,
            capped by usage count, and redeemable atomically.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {CAMPUS_ROLES.map((role) => (
              <Badge
                key={role}
                variant="secondary"
                className="gap-1.5 px-3 py-1.5 text-xs"
              >
                {CAMPUS_ROLE_LABELS[role]}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

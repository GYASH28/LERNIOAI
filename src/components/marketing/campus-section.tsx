import { Badge } from '@/components/ui/badge'
import { Building2 } from 'lucide-react'

const PROFILE_FIELDS = [
  ['Programme', 'CO (Computer Engineering)'],
  ['Department', 'Computer Engineering'],
  ['Semester', 'Semester 3'],
  ['Division', 'A'],
  ['Roll number', '23CO012'],
  ['Exam date', 'Used for your study plan'],
] as const

export function CampusSection() {
  return (
    <section
      id="campus"
      className="marketing-section border-b border-border bg-muted/30"
      aria-labelledby="campus-heading"
    >
      <div className="marketing-container grid gap-10 xl:grid-cols-[1fr_1fr] xl:items-center">
        <div className="max-w-xl">
          <p className="marketing-eyebrow">
            <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
            Built for CWIT, useful to students first
          </p>
          <h2 id="campus-heading" className="marketing-h2 mt-3 text-balance">
            Your programme, semester and profile in one place.
          </h2>
          <p className="marketing-lede mt-4 text-pretty">
            Lernio is built for the Cusrow Wadia Institute of Technology (CWIT)
            G Scheme. Your profile stores your programme, department, semester,
            division and roll number, so the curriculum rail always shows the
            right subjects.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Students can create an account directly. No invite required.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h3 className="text-sm font-bold text-foreground">
            What your profile stores
          </h3>
          <dl className="mt-4 grid gap-2 text-sm">
            {PROFILE_FIELDS.map(([label, value]) => (
              <div
                key={label}
                className="grid gap-1 rounded-lg border border-border bg-muted/30 p-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center"
              >
                <dt className="min-w-0">
                  <Badge variant="outline" className="text-xs">
                    {label}
                  </Badge>
                </dt>
                <dd className="min-w-0 break-words text-muted-foreground">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            Academic details are optional at signup. You can complete them
            later through onboarding.
          </p>
        </div>
      </div>
    </section>
  )
}

import { Badge } from '@/components/ui/badge'
import { Building2 } from 'lucide-react'

export function CampusSection() {
  return (
    <section
      id="campus"
      className="marketing-section border-b border-border bg-muted/30"
      aria-labelledby="campus-heading"
    >
      <div className="marketing-container grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
        <div className="max-w-xl">
          <p className="marketing-eyebrow">
            <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
            Built for CWIT, useful to students first
          </p>
          <h2 id="campus-heading" className="marketing-h2 mt-3">
            Your programme, semester and profile — in one place.
          </h2>
          <p className="marketing-lede mt-4">
            Lernio is built for the Cusrow Wadia Institute of Technology (CWIT)
            G Scheme. Your profile stores your programme, department, semester,
            division and roll number — so the curriculum rail always shows the
            right subjects.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Students can create an account directly. No invite required.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-sm font-bold text-foreground">
            What your profile stores
          </h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Badge variant="outline" className="text-[0.625rem]">Programme</Badge>
              e.g. CO (Computer Engineering)
            </li>
            <li className="flex items-center gap-2">
              <Badge variant="outline" className="text-[0.625rem]">Department</Badge>
              e.g. Computer Engineering
            </li>
            <li className="flex items-center gap-2">
              <Badge variant="outline" className="text-[0.625rem]">Semester</Badge>
              e.g. Semester 3
            </li>
            <li className="flex items-center gap-2">
              <Badge variant="outline" className="text-[0.625rem]">Division</Badge>
              e.g. A
            </li>
            <li className="flex items-center gap-2">
              <Badge variant="outline" className="text-[0.625rem]">Roll number</Badge>
              e.g. 23CO012
            </li>
            <li className="flex items-center gap-2">
              <Badge variant="outline" className="text-[0.625rem]">Exam date</Badge>
              used for your study plan
            </li>
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            Academic details are optional at signup — you can complete them
            later through onboarding.
          </p>
        </div>
      </div>
    </section>
  )
}

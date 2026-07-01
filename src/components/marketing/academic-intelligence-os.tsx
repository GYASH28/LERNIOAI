import type { CSSProperties } from 'react'
import {
  ACADEMIC_OS_LAYERS,
  ACADEMIC_OS_STATS,
  CAPABILITY_REPLACEMENTS,
  CORE_ROLE_WORKSPACES,
  CWIT_BRANCH_MATRIX,
  CWIT_SEMESTERS,
} from '@/lib/cwit-academic-os'
import { Badge } from '@/components/ui/badge'
import { BrainCircuit, CheckCircle2, LayoutDashboard, Network, Sparkles } from 'lucide-react'
import { MarketingSectionHeader } from './marketing-section'

export function AcademicIntelligenceOS() {
  return (
    <section
      id="academic-os"
      className="marketing-section academic-os-section border-b border-border"
      aria-labelledby="academic-os-heading"
    >
      <div className="marketing-container">
        <div className="grid gap-10 xl:grid-cols-[minmax(0,0.88fr)_minmax(34rem,1.12fr)] xl:items-start">
          <div className="max-w-2xl">
            <MarketingSectionHeader
              id="academic-os-heading"
              eyebrow={
                <>
                  <Network className="h-3.5 w-3.5" aria-hidden="true" />
                  CWIT Academic Intelligence OS
                </>
              }
              title="Seeded academics first. Dashboards appear from real college context."
              description="The new Lernio model starts from CWIT's branch, semester, subject and role structure. Students and staff should not build a college by hand before using the product."
              width="wide"
            />

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {ACADEMIC_OS_STATS.map((stat) => (
                <div key={stat.label} className="academic-os-stat">
                  <span className="academic-os-stat__value">{stat.value}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-foreground">{stat.label}</span>
                    <span className="block text-xs leading-5 text-muted-foreground">{stat.detail}</span>
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-7 rounded-xl border border-border bg-card/80 p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-foreground">Honest implementation status</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    The production seed currently covers the Computer Engineering Semester 3 pilot.
                    This blueprint section exposes the target 6-branch, 36-semester operating model without
                    pretending unverified curriculum data is complete.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="academic-os-board" aria-label="CWIT six branch by six semester dashboard matrix">
            <div className="academic-os-board__header">
              <span>
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                Dashboard matrix
              </span>
              <Badge variant="secondary">dynamic engine</Badge>
            </div>
            <div className="academic-os-grid" role="table" aria-label="CWIT branch semester matrix">
              <div className="academic-os-row" role="row">
                <div className="academic-os-cell academic-os-cell--empty" role="columnheader" aria-label="Branch" />
                {CWIT_SEMESTERS.map((semester) => (
                  <div key={semester} className="academic-os-cell academic-os-cell--head" role="columnheader">
                    S{semester}
                  </div>
                ))}
              </div>
              {CWIT_BRANCH_MATRIX.map((branch) => (
                <Row key={branch.code} branch={branch} />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="rounded-xl border border-border bg-card/75 p-5">
            <div className="mb-5 flex items-center gap-2 text-sm font-bold text-foreground">
              <BrainCircuit className="h-4 w-4 text-primary" aria-hidden="true" />
              Five connected layers
            </div>
            <ol className="grid gap-3">
              {ACADEMIC_OS_LAYERS.map((layer) => (
                <li key={layer.key} className="academic-os-layer">
                  <span className="academic-os-layer__key">{layer.key}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-foreground">{layer.title}</span>
                    <span className="block text-sm leading-6 text-muted-foreground">{layer.body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-xl border border-border bg-card/75 p-5">
            <div className="mb-5 flex items-center gap-2 text-sm font-bold text-foreground">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
              Role workspaces, not role plumbing
            </div>
            <div className="grid gap-3">
              {CORE_ROLE_WORKSPACES.map((item) => (
                <div key={item.role} className="academic-os-role">
                  <span className="font-semibold text-foreground">{item.role}</span>
                  <span className="text-sm leading-6 text-muted-foreground">{item.work}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {CAPABILITY_REPLACEMENTS.map((capability) => (
                <Badge key={capability} variant="outline" className="capitalize">
                  {capability}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Row({
  branch,
}: {
  branch: {
    code: string
    label: string
    name: string
    accentColor: string
  }
}) {
  return (
    <div className="academic-os-row" role="row">
      <div
        className="academic-os-cell academic-os-cell--branch"
        role="rowheader"
        style={{ '--branch-accent': branch.accentColor } as CSSProperties}
      >
        <span>{branch.code}</span>
        <small>{branch.label}</small>
      </div>
      {CWIT_SEMESTERS.map((semester) => (
        <div
          key={`${branch.code}-${semester}`}
          className="academic-os-cell academic-os-cell--semester"
          role="cell"
          style={{ '--branch-accent': branch.accentColor } as CSSProperties}
          aria-label={`${branch.name} semester ${semester}`}
        >
          <span>{branch.code.slice(0, 2)}</span>
          <small>S{semester}</small>
        </div>
      ))}
    </div>
  )
}

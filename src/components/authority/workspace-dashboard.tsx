import Link from 'next/link'
import { ArrowRight, BookOpen, ShieldCheck, Sparkles } from 'lucide-react'
import type { AuthorityContext } from '@/lib/authority'
import type { WorkspaceOverview } from '@/lib/authority/workspace-data'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LernioLogoTile } from '@/components/brand/lernio-logo'

interface WorkspaceDashboardProps {
  overview: WorkspaceOverview
  authority: AuthorityContext
}

export function WorkspaceDashboard({ overview, authority }: WorkspaceDashboardProps) {
  return (
    <main className="min-h-screen bg-background">
      <section className="border-b border-border/70 bg-[radial-gradient(circle_at_top_left,color-mix(in_oklch,var(--primary)_18%,transparent),transparent_34%),linear-gradient(135deg,color-mix(in_oklch,var(--background)_92%,white),var(--background))]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
          <nav className="flex flex-wrap items-center justify-between gap-3" aria-label="Workspace">
            <Link href="/dashboard" className="flex items-center gap-3">
              <LernioLogoTile size="md" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-tight">Lernio AI</span>
                <span className="block text-xs uppercase tracking-wider text-muted-foreground">Learning OS</span>
              </span>
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              {authority.activeRoles.map((role) => (
                <Badge key={role} variant="secondary" className="capitalize">
                  {role}
                </Badge>
              ))}
              <Button asChild size="sm" variant="outline">
                <Link href="/dashboard">Student workspace</Link>
              </Button>
            </div>
          </nav>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                <ShieldCheck className="h-3.5 w-3.5" />
                {overview.eyebrow}
              </div>
              <h1 className="text-balance text-4xl font-black leading-tight tracking-normal text-foreground sm:text-5xl">
                {overview.title}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                {overview.description}
              </p>
            </div>
            <Card className="border-primary/15 bg-card/80 backdrop-blur" surface="elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Scope guard
                </CardTitle>
                <CardDescription>{overview.scopeNote}</CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Subjects</dt>
                    <dd className="font-semibold">{authority.scopeIndex.subjectIds.length}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Departments</dt>
                    <dd className="font-semibold">
                      {authority.scopeIndex.departmentCodes.length + authority.scopeIndex.departmentIds.length}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Classes</dt>
                    <dd className="font-semibold">{authority.scopeIndex.classGroupIds.length}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Version</dt>
                    <dd className="font-semibold">{authority.authorityVersion}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
        {overview.metrics.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {overview.metrics.map((metric) => (
              <Card key={metric.label} className="min-h-32" surface="panel">
                <CardHeader>
                  <CardDescription>{metric.label}</CardDescription>
                  <CardTitle className="text-3xl font-black tracking-normal">{metric.value}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{metric.detail}</CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          {overview.actions.map((action) => (
            <Link key={action.href} href={action.href} className="group block">
              <Card className="h-full transition-transform duration-200 group-hover:-translate-y-0.5" surface="elevated">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-3 text-lg">
                    <span>{action.label}</span>
                    <ArrowRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-1" />
                  </CardTitle>
                  <CardDescription>{action.detail}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>

        <Card surface="inset">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4 text-primary" />
              Preserved student product
            </CardTitle>
            <CardDescription>
              Authority workspaces are additive. Dashboard, Learn, Practice, AI Tutor, Labs, Coding Lab, Exams,
              Revision, Materials, Planner, Analytics, and Profile remain available from the student workspace.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>
    </main>
  )
}

import Link from 'next/link'
import { ArrowLeft, ArrowRight, BookOpen, ClipboardCheck, GraduationCap, ShieldCheck, Users } from 'lucide-react'
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

const ROLE_COPY = {
  coordinator: { title: 'Coordinator Dashboard', subtitle: 'Manage your department, teachers, and learning progress.', icon: Users },
  teacher: { title: 'Teacher Dashboard', subtitle: 'Manage your subjects, lessons, questions, and class progress.', icon: GraduationCap },
  reviewer: { title: 'Reviewer Dashboard', subtitle: 'Check submitted learning content and approve what is ready.', icon: ClipboardCheck },
  moderator: { title: 'Moderator Dashboard', subtitle: 'Review reported content and keep the platform safe.', icon: ShieldCheck },
  cr: { title: 'CR Dashboard', subtitle: 'Help your class with resources, feedback, and issue reporting.', icon: Users },
  student: { title: 'Student Dashboard', subtitle: 'Continue learning, practising, and preparing for exams.', icon: BookOpen },
  admin: { title: 'Admin Dashboard', subtitle: 'Manage Lernio from one simple workspace.', icon: ShieldCheck },
} as const

export function WorkspaceDashboard({ overview, authority }: WorkspaceDashboardProps) {
  const copy = ROLE_COPY[overview.role]
  const Icon = copy.icon
  const firstName = authority.user.name.split(' ')[0]

  return (
    <main className="min-h-screen bg-muted/20">
      <header className="border-b border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-3">
            <LernioLogoTile size="md" />
            <div><p className="font-black">Lernio</p><p className="text-xs text-muted-foreground">{copy.title}</p></div>
          </Link>
          <Button asChild size="sm" variant="outline"><Link href="/dashboard"><ArrowLeft className="h-4 w-4" />Learning dashboard</Link></Button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm lg:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div><Badge variant="secondary" className="mb-3 capitalize">{overview.role}</Badge><h1 className="text-3xl font-black tracking-tight sm:text-4xl">Welcome, {firstName}</h1><p className="mt-3 max-w-2xl text-muted-foreground">{copy.subtitle}</p></div>
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary"><Icon className="h-7 w-7" /></div>
          </div>
        </section>

        {overview.metrics.length ? <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{overview.metrics.slice(0, 4).map((metric) => <Card key={metric.label} surface="panel"><CardHeader className="pb-2"><CardDescription>{metric.label}</CardDescription><CardTitle className="text-3xl font-black">{metric.value}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">{metric.detail}</CardContent></Card>)}</section> : null}

        <section>
          <div className="mb-4"><h2 className="text-xl font-black">Quick actions</h2><p className="text-sm text-muted-foreground">Choose what you want to do next.</p></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{overview.actions.slice(0, 3).map((action) => <Link key={action.href} href={action.href} className="group block"><Card className="h-full transition hover:-translate-y-0.5 hover:border-primary/30" surface="elevated"><CardHeader><CardTitle className="flex items-center justify-between gap-3 text-lg"><span>{action.label}</span><ArrowRight className="h-4 w-4 text-primary transition group-hover:translate-x-1" /></CardTitle><CardDescription className="leading-6">{action.detail}</CardDescription></CardHeader></Card></Link>)}</div>
        </section>
      </div>
    </main>
  )
}

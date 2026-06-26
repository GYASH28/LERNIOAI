import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import type { AuthorityContext } from '@/lib/authority'
import type { WorkspaceOverview } from '@/lib/authority/workspace-data'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LernioLogoTile } from '@/components/brand/lernio-logo'

export function SimpleWorkspaceDashboard({ overview, authority }: { overview: WorkspaceOverview; authority: AuthorityContext }) {
  const firstName = authority.user.name.split(' ')[0]
  const roleName = overview.role === 'cr' ? 'CR' : `${overview.role.slice(0, 1).toUpperCase()}${overview.role.slice(1)}`

  return <main className="min-h-screen bg-muted/20">
    <header className="border-b border-border/70 bg-background/95">
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/dashboard" className="flex items-center gap-3"><LernioLogoTile size="md" /><div><p className="font-black">Lernio</p><p className="text-xs text-muted-foreground">{roleName} Dashboard</p></div></Link>
        <Button asChild size="sm" variant="outline"><Link href="/dashboard"><ArrowLeft className="h-4 w-4" />Learning dashboard</Link></Button>
      </div>
    </header>

    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm lg:p-8">
        <Badge variant="secondary" className="mb-3">{roleName}</Badge>
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Welcome, {firstName}</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">{overview.description}</p>
      </section>

      {overview.metrics.length ? <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{overview.metrics.slice(0, 4).map((metric) => <Card key={metric.label} surface="panel"><CardHeader className="pb-2"><CardDescription>{metric.label}</CardDescription><CardTitle className="text-3xl font-black">{metric.value}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">{metric.detail}</CardContent></Card>)}</section> : null}

      <section>
        <div className="mb-4"><h2 className="text-xl font-black">Quick actions</h2><p className="text-sm text-muted-foreground">Choose what you want to do next.</p></div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{overview.actions.slice(0, 3).map((action) => <Link key={action.href} href={action.href} className="group block"><Card className="h-full transition hover:-translate-y-0.5 hover:border-primary/30" surface="elevated"><CardHeader><CardTitle className="flex items-center justify-between gap-3 text-lg"><span>{action.label}</span><ArrowRight className="h-4 w-4 text-primary transition group-hover:translate-x-1" /></CardTitle><CardDescription className="leading-6">{action.detail}</CardDescription></CardHeader></Card></Link>)}</div>
      </section>
    </div>
  </main>
}

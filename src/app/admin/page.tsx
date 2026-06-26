import type { Metadata } from 'next'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, CheckCircle2, Command, ShieldCheck } from 'lucide-react'
import { requireActiveRole } from '@/lib/auth'
import { getAdminCommandCenterData } from '@/lib/admin/campusmate-data'
import { CampusmateAdminShell } from '@/components/admin/campusmate-admin-shell'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Admin Command Center' }

export default async function AdminPage() {
  const authority = await requireActiveRole('admin')
  const data = await getAdminCommandCenterData()

  return (
    <CampusmateAdminShell user={{ name: authority.user.name, email: authority.user.email }}>
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm">
          <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-8">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-primary">
                <Command className="h-3.5 w-3.5" />Institution operations
              </div>
              <h2 className="max-w-4xl text-3xl font-black tracking-tight sm:text-5xl">A real management system for Lernio.</h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">Manage people, authority, academic hierarchy, syllabus sources, content quality, assessment operations, security, AI governance, and audit history from one CampusMate-style command center.</p>
            </div>
            <div className="rounded-2xl border border-primary/15 bg-primary/5 p-5">
              <div className="flex items-center gap-2 font-bold"><ShieldCheck className="h-5 w-5 text-primary" />Production authority</div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Every number below is read from Lernio’s PostgreSQL models. Role and scope operations remain protected by server-side authority checks.</p>
              <Link href="/admin/users" className="mt-4 inline-flex items-center gap-2 text-sm font-black text-primary hover:underline">Open User Management <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {data.metrics.map((metric) => (
            <Card key={metric.label} className="min-h-36" surface="panel">
              <CardHeader className="pb-2"><CardDescription>{metric.label}</CardDescription><CardTitle className="text-3xl font-black tracking-tight">{metric.value}</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">{metric.detail}</CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Card surface="elevated">
            <CardHeader><CardTitle>Operational priorities</CardTitle><CardDescription>Live exceptions that need an Admin decision.</CardDescription></CardHeader>
            <CardContent className="grid gap-3">
              {data.alerts.map((alert) => (
                <Link key={alert.href} href={alert.href} className="flex items-center justify-between gap-4 rounded-2xl border border-border p-4 transition-colors hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    {alert.value ? <AlertTriangle className="h-5 w-5 text-amber-500" /> : <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                    <div><p className="font-bold">{alert.label}</p><p className="text-sm text-muted-foreground">{alert.value ? 'Review required' : 'No outstanding issue'}</p></div>
                  </div>
                  <Badge variant={alert.value ? 'destructive' : 'secondary'}>{alert.value}</Badge>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card surface="elevated">
            <CardHeader><CardTitle>Recent audit activity</CardTitle><CardDescription>Latest recorded management and system actions.</CardDescription></CardHeader>
            <CardContent className="grid gap-3">
              {data.recentEvents.length ? data.recentEvents.map((event) => (
                <div key={event.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-3"><p className="truncate font-bold">{event.title}</p><Badge variant="outline">{event.status}</Badge></div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{event.subtitle}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{event.meta}</p>
                </div>
              )) : <p className="py-10 text-center text-sm text-muted-foreground">No audit activity has been recorded.</p>}
              <Link href="/admin/audit" className="inline-flex items-center gap-2 text-sm font-black text-primary hover:underline">Open Audit Explorer <ArrowRight className="h-4 w-4" /></Link>
            </CardContent>
          </Card>
        </section>
      </div>
    </CampusmateAdminShell>
  )
}

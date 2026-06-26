import Link from 'next/link'
import { ArrowRight, Database, Rows3 } from 'lucide-react'
import type { AdminModuleData } from '@/lib/admin/campusmate-data'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function badgeVariant(status: string) {
  const value = status.toLowerCase()
  if (['active', 'approved', 'published', 'verified', 'enabled', 'completed', 'resolved', 'recorded', 'normal'].includes(value)) return 'secondary' as const
  if (['failed', 'error', 'critical', 'disabled', 'revoked', 'rejected'].includes(value)) return 'destructive' as const
  return 'outline' as const
}

export function CampusmateModuleView({ data }: { data: AdminModuleData }) {
  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm lg:p-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
          <Database className="h-3.5 w-3.5" /> Live management data
        </div>
        <h2 className="text-3xl font-black tracking-tight sm:text-4xl">{data.title}</h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">{data.description}</p>
      </section>

      {data.metrics.length ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {data.metrics.map((metric) => (
            <Card key={metric.label} className="min-h-36" surface="panel">
              <CardHeader className="pb-2">
                <CardDescription>{metric.label}</CardDescription>
                <CardTitle className="text-3xl font-black tracking-tight">{metric.value}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{metric.detail}</CardContent>
            </Card>
          ))}
        </section>
      ) : null}

      <Card surface="elevated">
        <CardHeader className="border-b border-border/70">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2"><Rows3 className="h-5 w-5 text-primary" />Recent records</CardTitle>
              <CardDescription>Latest operational records for this management area.</CardDescription>
            </div>
            <Link href="/admin/audit" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
              Audit Explorer <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {data.rows.length ? (
            <div className="divide-y divide-border/70">
              {data.rows.map((row) => (
                <article key={row.id} className="grid gap-3 px-5 py-4 hover:bg-muted/35 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:px-6">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-bold">{row.title}</h3>
                      <Badge variant={badgeVariant(row.status)} className="capitalize">{row.status}</Badge>
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">{row.subtitle}</p>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground md:text-right">{row.meta}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="grid min-h-52 place-items-center p-8 text-center">
              <div><Rows3 className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 font-bold">Nothing to show yet</p><p className="mt-1 text-sm text-muted-foreground">{data.emptyMessage}</p></div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

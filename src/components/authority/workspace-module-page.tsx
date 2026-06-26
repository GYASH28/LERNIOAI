import Link from 'next/link'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import type { WorkspaceModule } from '@/lib/authority/workspace-modules'
import type { Role } from '@/lib/roles'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface WorkspaceModulePageProps {
  role: Role
  module: WorkspaceModule
}

export function WorkspaceModulePage({ role, module }: WorkspaceModulePageProps) {
  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/${role}`} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to {role}
            </Link>
          </Button>
          <Badge variant="secondary" className="capitalize">{role}</Badge>
        </div>

        <Card surface="elevated" className="border-primary/15">
          <CardHeader>
            <CardDescription className="flex items-center gap-2 text-primary">
              <ShieldCheck className="h-4 w-4" />
              {module.scopeNote}
            </CardDescription>
            <CardTitle className="text-3xl font-black tracking-normal">{module.title}</CardTitle>
            <CardDescription className="max-w-3xl text-base leading-7">{module.description}</CardDescription>
          </CardHeader>
        </Card>

        <div className="grid gap-3">
          {module.rows.map((row) => (
            <Card key={`${row.label}-${row.meta}`} surface="panel">
              <CardContent className="grid gap-2 py-5 sm:grid-cols-[minmax(0,1fr)_160px] sm:items-center">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{row.label}</p>
                  <p className="text-sm text-muted-foreground">{row.detail}</p>
                </div>
                <div className="text-sm font-medium text-primary sm:text-right">{row.meta}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  )
}

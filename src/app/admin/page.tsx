import type { Metadata } from 'next'
export const dynamic = 'force-dynamic'

import Link from 'next/link'
import {
  ArrowRight,
  BookOpenCheck,
  Building2,
  Database,
  FileText,
  History,
  ListChecks,
  MailPlus,
  Megaphone,
  Users,
} from 'lucide-react'
import { requireActiveRole } from '@/lib/auth'
import { getAdminCommandCenterData } from '@/lib/admin/campusmate-data'
import { CampusmateAdminShell } from '@/components/admin/campusmate-admin-shell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Admin Dashboard' }

const ACTIONS = [
  { label: 'People & Roles', detail: 'Manage users and assign campus roles.', href: '/admin/users', icon: Users },
  { label: 'Academic Setup', detail: 'Add departments, programmes, and classes.', href: '/admin/departments', icon: Building2 },
  { label: 'Learning Coverage', detail: 'Review R23 curriculum and resource publication gaps.', href: '/admin/learning/coverage', icon: BookOpenCheck },
  { label: 'Course Catalog', detail: 'Inspect source-backed course identity and unplaced CIOT blockers.', href: '/admin/learning/course-catalog', icon: Database },
  { label: 'Unit Review', detail: 'Inspect official unit extraction blockers before promotion.', href: '/admin/learning/unit-candidates', icon: ListChecks },
  { label: 'Lesson Notes', detail: 'Preview validated generated notes before PDF rendering.', href: '/admin/learning/notes', icon: FileText },
  { label: 'Invite Codes', detail: 'Create a code for teachers and other roles.', href: '/admin/invitations', icon: MailPlus },
  { label: 'Announcements', detail: 'Send a notice to students or staff.', href: '/admin/announcements', icon: Megaphone },
  { label: 'Activity Log', detail: 'Review recent management changes.', href: '/admin/audit', icon: History },
]

export default async function AdminPage() {
  const authority = await requireActiveRole('admin')
  const data = await getAdminCommandCenterData()
  const firstName = authority.user.name.split(' ')[0]

  return (
    <CampusmateAdminShell user={{ name: authority.user.name, email: authority.user.email }}>
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm lg:p-8">
          <p className="text-sm font-bold text-primary">Admin Dashboard</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Welcome, {firstName}</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">Choose a task below. Only the useful daily management tools are shown.</p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {data.metrics.slice(0, 4).map((metric) => (
            <Card key={metric.label} surface="panel">
              <CardHeader className="pb-2">
                <CardDescription>{metric.label}</CardDescription>
                <CardTitle className="text-3xl font-black">{metric.value}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{metric.detail}</CardContent>
            </Card>
          ))}
        </section>

        <section>
          <h3 className="mb-4 text-xl font-black">Quick actions</h3>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {ACTIONS.map((action) => {
              const Icon = action.icon
              return (
                <Link key={action.href} href={action.href} className="group block">
                  <Card className="h-full transition hover:-translate-y-0.5 hover:border-primary/30" surface="elevated">
                    <CardHeader>
                      <div className="mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
                      <CardTitle className="flex items-center justify-between gap-3">{action.label}<ArrowRight className="h-4 w-4 text-primary transition group-hover:translate-x-1" /></CardTitle>
                      <CardDescription className="leading-6">{action.detail}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              )
            })}
          </div>
        </section>
      </div>
    </CampusmateAdminShell>
  )
}

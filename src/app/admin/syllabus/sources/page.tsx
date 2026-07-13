import type { Metadata } from 'next'
export const dynamic = 'force-dynamic'

import type { ReactNode } from 'react'
import { revalidatePath } from 'next/cache'
import { BookMarked, FilePlus2 } from 'lucide-react'
import { db } from '@/lib/db'
import { requireActiveRole } from '@/lib/auth'
import { createSyllabusSource, listSyllabusSources, type CreateSyllabusSourceInput } from '@/lib/syllabus/source-service'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export const metadata: Metadata = { title: 'Syllabus Sources' }

async function registerSource(formData: FormData) {
  'use server'
  const authority = await requireActiveRole('admin')
  await createSyllabusSource(
    {
      institutionId: String(formData.get('institutionId') || ''),
      departmentId: clean(formData.get('departmentId')),
      programmeId: clean(formData.get('programmeId')),
      schemeId: clean(formData.get('schemeId')),
      title: String(formData.get('title') || ''),
      sourceType: String(formData.get('sourceType') || 'official_pdf') as CreateSyllabusSourceInput['sourceType'],
      sourceUrl: clean(formData.get('sourceUrl')),
      revisionLabel: clean(formData.get('revisionLabel')),
      trustLevel: String(formData.get('trustLevel') || 'official'),
      notes: clean(formData.get('notes')),
    },
    authority.user.id,
  )
  revalidatePath('/admin/syllabus/sources')
}

export default async function AdminSyllabusSourcesPage() {
  await requireActiveRole('admin')
  const [{ sources }, hierarchy] = await Promise.all([listSyllabusSources({ pageSize: 50 }), loadHierarchy()])

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b border-border/70 bg-muted/20">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-primary">
            <BookMarked className="h-4 w-4" />
            Admin / Syllabus Studio
          </div>
          <h1 className="text-3xl font-black tracking-normal">Source Registry</h1>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            Register official CWIT PDFs, structure sheets, amendments, assessment schemes, lab manuals, and verified
            internal documents before import or publication.
          </p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[360px_minmax(0,1fr)] sm:px-6 lg:px-8">
        <Card surface="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FilePlus2 className="h-4 w-4 text-primary" />
              Register Source
            </CardTitle>
            <CardDescription>URLs are validated before storage. Upload object keys can be wired later.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={registerSource} className="grid gap-4">
              <Field label="Institution">
                <select name="institutionId" required className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                  {hierarchy.institutions.map((institution) => (
                    <option key={institution.id} value={institution.id}>
                      {institution.code} - {institution.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Department">
                <select name="departmentId" className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Institution-wide</option>
                  {hierarchy.departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.code} - {department.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Programme">
                <select name="programmeId" className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">No programme scope</option>
                  {hierarchy.programmes.map((programme) => (
                    <option key={programme.id} value={programme.id}>
                      {programme.code} - {programme.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Scheme">
                <select name="schemeId" className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">No scheme scope</option>
                  {hierarchy.schemes.map((scheme) => (
                    <option key={scheme.id} value={scheme.id}>
                      {scheme.code} - {scheme.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Title">
                <Input name="title" minLength={3} maxLength={240} required placeholder="Computer Engineering R23 Curriculum" />
              </Field>
              <Field label="Source type">
                <select name="sourceType" className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="official_pdf">Official PDF</option>
                  <option value="structure_sheet">Structure sheet</option>
                  <option value="amendment">Amendment</option>
                  <option value="assessment_scheme">Assessment scheme</option>
                  <option value="lab_manual">Lab manual</option>
                  <option value="internal_verified_document">Internal verified document</option>
                </select>
              </Field>
              <Field label="Source URL">
                <Input name="sourceUrl" type="url" placeholder="https://cwit.mespune.org/..." />
              </Field>
              <Field label="Revision">
                <Input name="revisionLabel" placeholder="R23 / NEP 2020" />
              </Field>
              <Field label="Notes">
                <Textarea name="notes" placeholder="Evidence notes, page ranges, or rollout context" />
              </Field>
              <input type="hidden" name="trustLevel" value="official" />
              <Button type="submit">Register source</Button>
            </form>
          </CardContent>
        </Card>

        <Card surface="panel">
          <CardHeader>
            <CardTitle>Registered Sources</CardTitle>
            <CardDescription>{sources.length} source records shown. Each source has immutable snapshots.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Snapshots</TableHead>
                  <TableHead>Imports</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map((source) => (
                  <TableRow key={source.id}>
                    <TableCell className="max-w-md whitespace-normal">
                      <div className="font-medium">{source.title}</div>
                      <div className="text-xs text-muted-foreground">{source.sourceUrl ?? source.revisionLabel ?? 'Registered source'}</div>
                    </TableCell>
                    <TableCell>{source.sourceType}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{source.status}</Badge>
                    </TableCell>
                    <TableCell>{source._count.snapshots}</TableCell>
                    <TableCell>{source._count.importJobs}</TableCell>
                  </TableRow>
                ))}
                {sources.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No syllabus sources registered yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Label className="grid gap-2">
      <span>{label}</span>
      {children}
    </Label>
  )
}

function clean(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim()
  return text ? text : null
}

async function loadHierarchy() {
  const [institutions, departments, programmes, schemes] = await Promise.all([
    db.institution.findMany({ orderBy: { code: 'asc' }, select: { id: true, code: true, name: true } }),
    db.department.findMany({ orderBy: { code: 'asc' }, select: { id: true, code: true, name: true } }),
    db.programme.findMany({ orderBy: { code: 'asc' }, select: { id: true, code: true, name: true } }),
    db.academicScheme.findMany({ orderBy: { code: 'asc' }, select: { id: true, code: true, name: true } }),
  ])
  return { institutions, departments, programmes, schemes }
}

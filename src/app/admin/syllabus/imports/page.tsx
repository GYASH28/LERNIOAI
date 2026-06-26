import type { Metadata } from 'next'
import { revalidatePath } from 'next/cache'
import { ClipboardCheck, PlayCircle } from 'lucide-react'
import { db } from '@/lib/db'
import { requireActiveRole } from '@/lib/auth'
import { listSyllabusImportJobs, queueSyllabusImport } from '@/lib/syllabus/source-service'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export const metadata: Metadata = { title: 'Syllabus Imports' }

async function queueImport(formData: FormData) {
  'use server'
  const authority = await requireActiveRole('admin')
  await queueSyllabusImport(
    {
      syllabusDocumentId: String(formData.get('syllabusDocumentId') || ''),
      parserVersion: String(formData.get('parserVersion') || 'manual-review-v1'),
    },
    authority.user.id,
  )
  revalidatePath('/admin/syllabus/imports')
}

export default async function AdminSyllabusImportsPage() {
  await requireActiveRole('admin')
  const [{ jobs }, sources] = await Promise.all([
    listSyllabusImportJobs({ pageSize: 50 }),
    db.syllabusDocument.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 100,
      select: { id: true, title: true, sourceType: true, revisionLabel: true, status: true },
    }),
  ])

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b border-border/70 bg-muted/20">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-primary">
            <ClipboardCheck className="h-4 w-4" />
            Admin / Syllabus Studio
          </div>
          <h1 className="text-3xl font-black tracking-normal">Import Queue</h1>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            Queue source documents for page-aware extraction and human review. This phase records durable jobs; parser
            workers can safely pick them up later.
          </p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[360px_minmax(0,1fr)] sm:px-6 lg:px-8">
        <Card surface="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PlayCircle className="h-4 w-4 text-primary" />
              Queue Import
            </CardTitle>
            <CardDescription>Queued jobs stay pending until an extraction worker or human review process runs.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={queueImport} className="grid gap-4">
              <Label className="grid gap-2">
                <span>Registered source</span>
                <select name="syllabusDocumentId" required className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                  {sources.map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.title} - {source.revisionLabel ?? source.sourceType}
                    </option>
                  ))}
                </select>
              </Label>
              <Label className="grid gap-2">
                <span>Parser version</span>
                <select name="parserVersion" className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="manual-review-v1">Manual review v1</option>
                  <option value="pdf-table-v1">PDF table extraction v1</option>
                  <option value="ocr-fallback-v1">OCR fallback v1</option>
                </select>
              </Label>
              <Button type="submit" disabled={sources.length === 0}>
                Queue import
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card surface="panel">
          <CardHeader>
            <CardTitle>Import Jobs</CardTitle>
            <CardDescription>{jobs.length} jobs shown with source, parser, and finding counts.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Parser</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Findings</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="max-w-md whitespace-normal">
                      <div className="font-medium">{job.syllabusDocument.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {job.syllabusDocument.revisionLabel ?? job.syllabusDocument.sourceType}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{job.state}</Badge>
                    </TableCell>
                    <TableCell>{job.parserVersion}</TableCell>
                    <TableCell>{job.attemptCount}</TableCell>
                    <TableCell>{job._count.findings}</TableCell>
                  </TableRow>
                ))}
                {jobs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No syllabus imports queued yet.
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
